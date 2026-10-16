#!/bin/sh
# Usage: dispatch.sh [--workspace ID --self-pane ID] <target> <brief-path>
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
WS=; SELF=; WS_SET=0; SELF_SET=0
TARGET=; BRIEF=
POS_COUNT=0

while [ $# -gt 0 ]; do
  case "$1" in
    --workspace)
      [ $# -ge 2 ] || { echo "usage: $0 [--workspace ID --self-pane ID] <target> <brief-path>" >&2; exit 2; }
      WS=$2; WS_SET=1; shift 2;;
    --self-pane)
      [ $# -ge 2 ] || { echo "usage: $0 [--workspace ID --self-pane ID] <target> <brief-path>" >&2; exit 2; }
      SELF=$2; SELF_SET=1; shift 2;;
    --)
      shift
      while [ $# -gt 0 ]; do
        case "$POS_COUNT" in
          0) TARGET=$1; POS_COUNT=1;;
          1) BRIEF=$1; POS_COUNT=2;;
          *) echo "usage: $0 [--workspace ID --self-pane ID] <target> <brief-path>" >&2; exit 2;;
        esac
        shift
      done
      break;;
    --*)
      echo "unknown option: $1" >&2; exit 2;;
    *)
      case "$POS_COUNT" in
        0) TARGET=$1; POS_COUNT=1;;
        1) BRIEF=$1; POS_COUNT=2;;
        *) echo "usage: $0 [--workspace ID --self-pane ID] <target> <brief-path>" >&2; exit 2;;
      esac
      shift;;
  esac
done

[ "$POS_COUNT" -eq 2 ] || { echo "usage: $0 [--workspace ID --self-pane ID] <target> <brief-path>" >&2; exit 2; }

case "$BRIEF" in /*) ;; *) BRIEF="$ROOT/$BRIEF";; esac
[ -f "$BRIEF" ] || { echo "brief missing: $BRIEF" >&2; exit 1; }

# Resolve context and validate target scoping via context.sh without eval or unquoted expansion
set -- "$HERE/context.sh"
if [ "$WS_SET" -eq 1 ] || [ "$SELF_SET" -eq 1 ]; then
  [ "$WS_SET" -eq 1 ] && set -- "$@" --workspace "$WS"
  [ "$SELF_SET" -eq 1 ] && set -- "$@" --self-pane "$SELF"
fi
set -- "$@" --target "$TARGET"

ctx=$("$@") || exit $?

st=$(printf '%s\n' "$ctx" | jq -r '.targets[0].agent_status // empty')
case "$st" in
  idle|done) ;;
  *) echo "target not idle/done: $TARGET ($st)" >&2; exit 1;;
esac

msg="Read $BRIEF, follow AGENTS.md, write report to the path stated in the brief."
herdr agent prompt "$TARGET" "$msg" >/dev/null || { echo "prompt failed: $TARGET" >&2; exit 1; }
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EPOCH=$(date +%s)
echo "dispatched $TARGET at $TS ($EPOCH)"