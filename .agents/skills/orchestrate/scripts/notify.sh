#!/bin/sh
# Usage: notify.sh [--status done|blocked|failed] [--unit UNIT] [--self-pane PANE] [--dry-run] <target-pane> <report-path> [msg]
# Write durable callback record to tmp/<task>/callbacks.log and state.md, then prompt target via herdr.
# Sync attempt is quick (one prompt + verify); on failure record delivered=pending and detach
# redeliver.sh --resend in background (worker never blocks on retry). Final outcome (yes/no) is
# appended by the background retry. Exit 0 on logged delivery or pending; 1 on log unwritable; 2 on bad args.
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
RYES="[$TS] worker=$SELF unit=$UNIT status=$STATUS report=$REPORT target=$TARGET token=$TOKEN delivered=yes${MSG:+ msg=\"$MSG\"}"
RPEND="[$TS] worker=$SELF unit=$UNIT status=$STATUS report=$REPORT target=$TARGET token=$TOKEN delivered=pending${MSG:+ msg=\"$MSG\"}"
SYES="$TS callback $STATUS $SELF $UNIT report=$REPORT target=$TARGET token=$TOKEN delivered=yes${MSG:+ msg=\"$MSG\"}"
SPEND="$TS callback $STATUS $SELF $UNIT report=$REPORT target=$TARGET token=$TOKEN delivered=pending${MSG:+ msg=\"$MSG\"}"
LOG_FILE="$LOG_DIR/callbacks.log"; STATE_FILE="$LOG_DIR/state.md"
if [ "$DRY_RUN" -eq 1 ]; then
  echo "[dry-run] prompt $TARGET: $BODY"
  echo "[dry-run] record: $RYES"
  exit 0
fi
mkdir -p "$LOG_DIR" 2>/dev/null || die 1 "cannot create log directory: $LOG_DIR"
SENT=0
if command -v herdr >/dev/null 2>&1 && herdr agent prompt "$TARGET" "$BODY" >/dev/null 2>&1; then
  N=0; LIM=${NOTIFY_VERIFY_TRIES:-3}; SLP=${NOTIFY_VERIFY_SLEEP:-0.3}
  while [ "$N" -lt "$LIM" ]; do
    if herdr pane read "$TARGET" --source visible 2>/dev/null | grep -Fq "$TOKEN"; then SENT=1; break; fi
    [ "$SLP" = "0" ] || sleep "$SLP"
    N=$((N + 1))
  done
fi
if [ "$SENT" -eq 1 ]; then
  printf '%s\n' "$RYES" >> "$LOG_FILE" 2>/dev/null || die 1 "cannot write callback log: $LOG_FILE"
  printf '%s\n' "$SYES" >> "$STATE_FILE" 2>/dev/null || die 1 "cannot write state log: $STATE_FILE"
  echo "notified $TARGET: $BODY"
  exit 0
fi
printf '%s\n' "$RPEND" >> "$LOG_FILE" 2>/dev/null || die 1 "cannot write callback log: $LOG_FILE"
printf '%s\n' "$SPEND" >> "$STATE_FILE" 2>/dev/null || die 1 "cannot write state log: $STATE_FILE"
if [ "${NOTIFY_DETACH:-1}" = 1 ] && [ -x "$HERE/redeliver.sh" ]; then
  nohup "$HERE/redeliver.sh" "$LOG_DIR" --resend >/dev/null 2>&1 &
fi
echo "delivery pending to $TARGET: logged delivered=pending to $LOG_FILE (background retry detached)"
exit 0
