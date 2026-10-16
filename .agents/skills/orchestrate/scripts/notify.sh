#!/bin/sh
# Usage: notify.sh [--status done|blocked|failed] [--unit UNIT] [--self-pane PANE] <target-pane> <report-path> [msg]
# Write durable callback record to tmp/<task>/callbacks.log and prompt target pane via herdr.
# Exit 0 on delivery or when queued (target blocked); 1 if log unwritable; 2 on bad args.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
die() { rc=$1; shift; echo "notify.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 [--status done|blocked|failed] [--unit UNIT] [--self-pane PANE] <target-pane> <report-path> [msg]"; }

STATUS=; UNIT=; SELF=
while [ $# -gt 0 ]; do
  case "$1" in
    --status) [ $# -ge 2 ] || usage; STATUS=$2; shift 2;;
    --unit) [ $# -ge 2 ] || usage; UNIT=$2; shift 2;;
    --self-pane) [ $# -ge 2 ] || usage; SELF=$2; shift 2;;
    --) shift; break;;
    --*) usage;;
    *) break;;
  esac
done

[ $# -ge 2 ] || usage
TARGET=$1; REPORT=$2; shift 2
MSG="$*"

[ "${HERDR_ENV:-}" = 1 ] || die 2 "HERDR_ENV is not 1: run inside a herdr pane"

if [ -z "$SELF" ]; then
  SELF="${HERDR_PANE_ID:-}"
  [ -n "$SELF" ] || die 2 "caller self-pane unknown (set HERDR_PANE_ID or pass --self-pane)"
fi

if [ -z "$STATUS" ]; then
  case "$MSG" in
    blocked*|BLOCKED*) STATUS=blocked;;
    failed*|FAIL*|fail*) STATUS=failed;;
    *) STATUS=done;;
  esac
fi
case "$STATUS" in
  done|blocked|failed) ;;
  *) die 2 "invalid status: '$STATUS' (must be done, blocked, or failed)";;
esac

case "$REPORT" in
  */tmp/*) rest=${REPORT#*tmp/}; TASK=${rest%%/*};;
  tmp/*) rest=${REPORT#tmp/}; TASK=${rest%%/*};;
  *) TASK=${UNIT:-task};;
esac
[ -n "$UNIT" ] || UNIT="$TASK"

LOG_DIR="$ROOT/tmp/$TASK"
mkdir -p "$LOG_DIR" 2>/dev/null || die 1 "cannot create log directory: $LOG_DIR"
LOG_FILE="$LOG_DIR/callbacks.log"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Durable callback record written first
RECORD="[$TS] worker=$SELF unit=$UNIT status=$STATUS report=$REPORT${MSG:+ msg=\"$MSG\"}"
printf '%s\n' "$RECORD" >> "$LOG_FILE" 2>/dev/null || die 1 "cannot write callback log: $LOG_FILE"

BODY="[callback] worker=$SELF unit=$UNIT status=$STATUS report=$REPORT"
[ -z "$MSG" ] || BODY="$BODY msg=\"$MSG\""

# Attempt herdr delivery with backoff (e.g. NOTIFY_BACKOFFS="5 15 30" or test override)
NOTIFY_BACKOFFS=${NOTIFY_BACKOFFS:-"5 15 30"}
sent=0
for delay in 0 $NOTIFY_BACKOFFS; do
  [ "$delay" -eq 0 ] || sleep "$delay"
  if command -v herdr >/dev/null 2>&1 && herdr agent prompt "$TARGET" "$BODY" >/dev/null 2>&1; then
    sent=1
    break
  fi
done

if [ "$sent" -eq 1 ]; then
  echo "notified $TARGET: $BODY"
else
  echo "queued (target blocked): logged to $LOG_FILE"
fi
exit 0
