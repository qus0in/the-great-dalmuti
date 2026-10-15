#!/bin/sh
# Usage: workers.sh [--idle] [--model]
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
IDLE=0; MODEL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --idle) IDLE=1; shift;;
    --model) MODEL=1; shift;;
    *) echo "usage: $0 [--idle] [--model]" >&2; exit 2;;
  esac
done
: "${HERDR_WORKSPACE_ID:?missing}"
: "${HERDR_PANE_ID:?missing}"
json=$(herdr agent list) || exit 1
printf '%s\n' "$json" | jq -r --arg ws "$HERDR_WORKSPACE_ID" --arg me "$HERDR_PANE_ID" --argjson idle "$IDLE" '
  .result.agents[]
  | select(.workspace_id == $ws and .pane_id != $me)
  | select($idle == 0 or .agent_status == "idle" or .agent_status == "done")
  | [ (if ((.name // "") != "") then .name else .pane_id end), .agent, .agent_status, .pane_id ] | @tsv
' | while IFS="$(printf '\t')" read -r target agent status pane; do
  [ -n "$target" ] || continue
  if [ "$MODEL" -eq 1 ]; then
    line=$(herdr pane read "$pane" --source visible 2>/dev/null | grep 'OpenCode' | grep 'Go' | tail -n 1) || true
    model=$(printf '%s\n' "$line" | sed 's/OpenCode.*//' | sed 's/.*·[[:space:]]*//' | sed 's/[[:space:]]*$//') || true
    [ -n "$model" ] || model='?'
    printf '%s %s %s %s\n' "$target" "$agent" "$status" "$model"
  else
    printf '%s %s %s\n' "$target" "$agent" "$status"
  fi
done