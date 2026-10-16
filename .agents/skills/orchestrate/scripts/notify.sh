#!/bin/sh
# Usage: notify.sh [--status done|blocked|failed] [--unit UNIT] [--self-pane PANE] <target-pane> <report-path> [msg]
# Send completion/blocked/failure callback to target pane via herdr. Exit 0 ok; 1 failure; 2 usage.
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
command -v herdr >/dev/null 2>&1 || die 1 "herdr not found in PATH"

herdr agent get "$TARGET" >/dev/null 2>&1 || herdr pane get "$TARGET" >/dev/null 2>&1 || die 1 "target not found: $TARGET"

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

if [ -z "$UNIT" ]; then
  DIR=$(dirname "$REPORT")
  case "$DIR" in
    tmp/*) UNIT=$(basename "$DIR");;
    .) UNIT=$(basename "$REPORT" .md);;
    *) UNIT=$(basename "$DIR");;
  esac
fi

BODY="[callback] worker=$SELF unit=$UNIT status=$STATUS report=$REPORT"
[ -z "$MSG" ] || BODY="$BODY msg=\"$MSG\""

herdr agent prompt "$TARGET" "$BODY" >/dev/null 2>&1 || die 1 "failed to prompt target: $TARGET"
echo "notified $TARGET: $BODY"
