#!/bin/sh
# Usage: dispatch.sh [--workspace ID --self-pane ID] [--notify PANE] [--then TARGET BRIEF] <target> <brief-path>
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
die() { rc=$1; shift; echo "dispatch.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 [--workspace ID --self-pane ID] [--notify PANE] [--then TARGET BRIEF] <target> <brief-path>"; }

WS=; SELF=; WS_SET=0; SELF_SET=0
NOTIFY=; NOTIFY_SET=0
THEN_TARGET=; THEN_BRIEF=; THEN_SET=0
TARGET=; BRIEF=; POS_COUNT=0

while [ $# -gt 0 ]; do
  case "$1" in
    --workspace) [ $# -ge 2 ] || usage; WS=$2; WS_SET=1; shift 2;;
    --self-pane) [ $# -ge 2 ] || usage; SELF=$2; SELF_SET=1; shift 2;;
    --notify) [ $# -ge 2 ] || usage; NOTIFY=$2; NOTIFY_SET=1; shift 2;;
    --then) [ $# -ge 3 ] || usage; THEN_TARGET=$2; THEN_BRIEF=$3; THEN_SET=1; shift 3;;
    --)
      shift
      while [ $# -gt 0 ]; do
        case "$POS_COUNT" in 0) TARGET=$1; POS_COUNT=1;; 1) BRIEF=$1; POS_COUNT=2;; *) usage;; esac
        shift
      done; break;;
    --*) usage;;
    *)
      case "$POS_COUNT" in 0) TARGET=$1; POS_COUNT=1;; 1) BRIEF=$1; POS_COUNT=2;; *) usage;; esac
      shift;;
  esac
done

[ "$POS_COUNT" -eq 2 ] || usage
case "$BRIEF" in /*) ;; *) BRIEF="$ROOT/$BRIEF";; esac
[ -f "$BRIEF" ] || die 1 "brief missing: $BRIEF"

if [ "$THEN_SET" -eq 1 ]; then
  case "$THEN_BRIEF" in /*) ;; *) THEN_BRIEF="$ROOT/$THEN_BRIEF";; esac
  [ -f "$THEN_BRIEF" ] || die 1 "then-brief missing: $THEN_BRIEF"
fi

set -- "$HERE/context.sh"
if [ "$WS_SET" -eq 1 ] || [ "$SELF_SET" -eq 1 ]; then
  [ "$WS_SET" -eq 1 ] && set -- "$@" --workspace "$WS"
  [ "$SELF_SET" -eq 1 ] && set -- "$@" --self-pane "$SELF"
fi
set -- "$@" --target "$TARGET"
[ "$THEN_SET" -eq 0 ] || set -- "$@" --target "$THEN_TARGET"

ctx=$("$@") || exit $?

st=$(printf '%s\n' "$ctx" | jq -r '.targets[0].agent_status // empty')
case "$st" in
  idle|done) ;;
  *) die 1 "target not idle/done: $TARGET ($st)";;
esac

if [ "$NOTIFY_SET" -eq 0 ]; then
  NOTIFY=$(printf '%s\n' "$ctx" | jq -r '.self_pane // empty')
  [ -n "$NOTIFY" ] || die 2 "cannot determine notify pane (pass --notify <pane>)"
fi

if [ "$THEN_SET" -eq 1 ]; then
  msg="Read $BRIEF, follow AGENTS.md, write report to the path stated in the brief. On completion: if done, dispatch review via '.agents/skills/orchestrate/scripts/dispatch.sh --notify $NOTIFY $THEN_TARGET $THEN_BRIEF' (if reviewer busy: '.agents/skills/orchestrate/scripts/notify.sh $NOTIFY <report-path> \"reviewer busy\"'); if blocked/failed: '.agents/skills/orchestrate/scripts/notify.sh --status <status> $NOTIFY <report-path>'."
else
  msg="Read $BRIEF, follow AGENTS.md, write report to the path stated in the brief. When done, blocked, or failed: run .agents/skills/orchestrate/scripts/notify.sh $NOTIFY <report-path>."
fi

herdr agent prompt "$TARGET" "$msg" >/dev/null || die 1 "prompt failed: $TARGET"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EPOCH=$(date +%s)
echo "dispatched $TARGET at $TS ($EPOCH)"
