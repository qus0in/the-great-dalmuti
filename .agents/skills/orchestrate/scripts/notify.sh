#!/bin/sh
# Usage: notify.sh [--status done|blocked|failed] [--unit UNIT] [--self-pane PANE] [--dry-run] <target-pane> <report-path> [msg]
# Write durable callback record to tmp/<task>/callbacks.log and state.md, then prompt target pane via herdr.
# Exit 0 on delivery; 1 on delivery failure or log unwritable; 2 on bad args.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(git rev-parse --show-toplevel 2>/dev/null || (cd "$HERE/../../../.." && pwd))
die() { rc=$1; shift; echo "notify.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 [--status done|blocked|failed] [--unit UNIT] [--self-pane PANE] [--dry-run] <target-pane> <report-path> [msg]"; }

STATUS=; UNIT=; SELF=; DRY_RUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --status) [ $# -ge 2 ] || usage; STATUS=$2; shift 2;;
    --unit) [ $# -ge 2 ] || usage; UNIT=$2; shift 2;;
    --self-pane) [ $# -ge 2 ] || usage; SELF=$2; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    --) shift; break;;
    --*) usage;;
    *) break;;
  esac
done

[ $# -ge 2 ] || usage
TARGET=$1; REPORT=$2; shift 2; MSG="$*"
[ "${HERDR_ENV:-}" = 1 ] || die 2 "HERDR_ENV is not 1: run inside a herdr pane"
if [ -z "$SELF" ]; then
  SELF="${HERDR_PANE_ID:-}"; [ -n "$SELF" ] || die 2 "caller self-pane unknown (set HERDR_PANE_ID or pass --self-pane)"
fi

if [ -z "$STATUS" ]; then
  case "$MSG" in blocked*|BLOCKED*) STATUS=blocked;; failed*|FAIL*|fail*) STATUS=failed;; *) STATUS=done;; esac
fi
case "$STATUS" in done|blocked|failed) ;; *) die 2 "invalid status: '$STATUS' (must be done, blocked, or failed)";; esac

case "$REPORT" in
  /tmp/*)
    rest=${REPORT#/tmp/}; TASK=${rest%%/*}
    [ -d "/tmp/$TASK" ] && LOG_DIR="/tmp/$TASK" || LOG_DIR="$ROOT/tmp/$TASK";;
  */tmp/*) rest=${REPORT#*tmp/}; TASK=${rest%%/*}; LOG_DIR="$ROOT/tmp/$TASK";;
  tmp/*) rest=${REPORT#tmp/}; TASK=${rest%%/*}; LOG_DIR="$ROOT/tmp/$TASK";;
  *) TASK=${UNIT:-task}; LOG_DIR="$ROOT/tmp/$TASK";;
esac

if [ -z "$UNIT" ]; then
  case "$REPORT" in *report-*.md|*review-*.md)
    rbase=$(basename "$REPORT" .md); cand=${rbase#report-}; cand=${cand#review-}
    [ -n "$cand" ] && UNIT="$cand";;
  esac
fi
[ -n "$UNIT" ] || UNIT="$TASK"

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
TOKEN="cb-${TS}-${UNIT}-$$"
BODY="[callback] token=$TOKEN worker=$SELF unit=$UNIT status=$STATUS report=$REPORT"
[ -z "$MSG" ] || BODY="$BODY msg=\"$MSG\""
RECORD_YES="[$TS] worker=$SELF unit=$UNIT status=$STATUS report=$REPORT delivered=yes${MSG:+ msg=\"$MSG\"}"
RECORD_NO="[$TS] worker=$SELF unit=$UNIT status=$STATUS report=$REPORT delivered=no${MSG:+ msg=\"$MSG\"}"
STATE_YES="$TS callback $STATUS $SELF $UNIT report=$REPORT delivered=yes${MSG:+ msg=\"$MSG\"}"
STATE_NO="$TS callback $STATUS $SELF $UNIT report=$REPORT delivered=no${MSG:+ msg=\"$MSG\"}"

LOG_FILE="$LOG_DIR/callbacks.log"; STATE_FILE="$LOG_DIR/state.md"
if [ "$DRY_RUN" -eq 1 ]; then
  echo "[dry-run] prompt $TARGET: $BODY"
  echo "[dry-run] record: $RECORD_YES"
  exit 0
fi

mkdir -p "$LOG_DIR" 2>/dev/null || die 1 "cannot create log directory: $LOG_DIR"

NOTIFY_BACKOFFS=${NOTIFY_BACKOFFS-"5 15 30"}
NOTIFY_VERIFY_TRIES=${NOTIFY_VERIFY_TRIES-"3"}
NOTIFY_VERIFY_SLEEP=${NOTIFY_VERIFY_SLEEP-"0.3"}
sent=0
for delay in 0 $NOTIFY_BACKOFFS; do
  [ "$delay" -eq 0 ] || sleep "$delay"
  if command -v herdr >/dev/null 2>&1 && herdr agent prompt "$TARGET" "$BODY" >/dev/null 2>&1; then
    vtries=0
    while [ "$vtries" -lt "$NOTIFY_VERIFY_TRIES" ]; do
      if herdr pane read "$TARGET" --source visible 2>/dev/null | grep -Fq "$TOKEN"; then
        sent=1; break 2
      fi
      [ "$NOTIFY_VERIFY_SLEEP" = "0" ] || sleep "$NOTIFY_VERIFY_SLEEP"
      vtries=$((vtries + 1))
    done
  fi
done

if [ "$sent" -eq 1 ]; then
  printf '%s\n' "$RECORD_YES" >> "$LOG_FILE" 2>/dev/null || die 1 "cannot write callback log: $LOG_FILE"
  printf '%s\n' "$STATE_YES" >> "$STATE_FILE" 2>/dev/null || die 1 "cannot write state log: $STATE_FILE"
  echo "notified $TARGET: $BODY"
  exit 0
fi

printf '%s\n' "$RECORD_NO" >> "$LOG_FILE" 2>/dev/null || die 1 "cannot write callback log: $LOG_FILE"
printf '%s\n' "$STATE_NO" >> "$STATE_FILE" 2>/dev/null || die 1 "cannot write state log: $STATE_FILE"
echo "delivery failed to $TARGET: logged delivered=no to $LOG_FILE"
exit 1
