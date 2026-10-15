#!/bin/sh
# Usage: dispatch.sh <target> <brief-path>
set -eu
[ $# -eq 2 ] || { echo "usage: $0 <target> <brief-path>" >&2; exit 2; }
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
TARGET=$1; BRIEF=$2
case "$BRIEF" in /*) ;; *) BRIEF="$ROOT/$BRIEF";; esac
[ -f "$BRIEF" ] || { echo "brief missing: $BRIEF" >&2; exit 1; }
: "${HERDR_WORKSPACE_ID:?missing}"
info=$(herdr agent get "$TARGET") || exit 1
ws=$(printf '%s\n' "$info" | jq -r '.result.agent.workspace_id')
st=$(printf '%s\n' "$info" | jq -r '.result.agent.agent_status')
[ "$ws" = "$HERDR_WORKSPACE_ID" ] || { echo "target not in workspace: $TARGET" >&2; exit 1; }
case "$st" in idle|done) ;; *) echo "target not idle/done: $TARGET ($st)" >&2; exit 1;; esac
msg="Read $BRIEF, follow AGENTS.md, write report to the path stated in the brief."
herdr agent prompt "$TARGET" "$msg" >/dev/null
echo "dispatched $TARGET"