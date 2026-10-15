#!/bin/sh
# Usage: workers.sh [--idle] [--model] [--workspace ID --self-pane ID]
# Output (default): <target> <agent> <status>
# Output (--model): <target> <agent> <status> <model> <effort>
# Note: <model> may be multi-word; <effort> is the final token ('none', '?', or effort name).
# List agents in this workspace excluding the current pane.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
. "$HERE/model-footer.sh"
IDLE=0; MODEL=0
WS=; SELF=; WS_SET=0; SELF_SET=0

while [ $# -gt 0 ]; do
  case "$1" in
    --idle)
      IDLE=1; shift;;
    --model)
      MODEL=1; shift;;
    --workspace)
      [ $# -ge 2 ] || { echo "usage: $0 [--idle] [--model] [--workspace ID --self-pane ID]" >&2; exit 2; }
      WS=$2; WS_SET=1; shift 2;;
    --self-pane)
      [ $# -ge 2 ] || { echo "usage: $0 [--idle] [--model] [--workspace ID --self-pane ID]" >&2; exit 2; }
      SELF=$2; SELF_SET=1; shift 2;;
    *)
      echo "usage: $0 [--idle] [--model] [--workspace ID --self-pane ID]" >&2; exit 2;;
  esac
done

# Resolve and validate context via shared context.sh safely without unquoted expansion
if [ "$WS_SET" -eq 1 ] || [ "$SELF_SET" -eq 1 ]; then
  set -- "$HERE/context.sh"
  [ "$WS_SET" -eq 1 ] && set -- "$@" --workspace "$WS"
  [ "$SELF_SET" -eq 1 ] && set -- "$@" --self-pane "$SELF"
  ctx=$("$@") || exit $?
else
  ctx=$("$HERE/context.sh") || exit $?
fi

WS=$(printf '%s\n' "$ctx" | jq -r '.workspace_id // empty')
ME=$(printf '%s\n' "$ctx" | jq -r '.self_pane // empty')
[ -n "$WS" ] && [ -n "$ME" ] || { echo "workers.sh: failed resolving context" >&2; exit 1; }

json=$(herdr agent list 2>/dev/null) || { echo "workers.sh: 'herdr agent list' failed" >&2; exit 1; }

# Validate agent list structure and entry field types
printf '%s\n' "$json" | jq -e '
  .result.agents
  | if type != "array" then false
    else all(.[]; (type == "object" and . != null and (.pane_id | type == "string" and . != "") and (.workspace_id | type == "string" and . != "") and (.agent | type == "string" and . != "") and (.agent_status | type == "string" and . != "")))
    end
  | if . then true else error("malformed entry") end
' >/dev/null 2>&1 || { echo "workers.sh: malformed 'herdr agent list' output (invalid entry structure)" >&2; exit 1; }

# Extract entries into variable and propagate any jq extraction errors
entries=$(printf '%s\n' "$json" | jq -r --arg ws "$WS" --arg me "$ME" --argjson idle "$IDLE" '
  .result.agents[]
  | select(.workspace_id == $ws and .pane_id != $me)
  | select($idle == 0 or .agent_status == "idle" or .agent_status == "done")
  | [ (if ((.name // "") != "") then .name else .pane_id end), .agent, .agent_status, .pane_id ] | @tsv
') || { echo "workers.sh: jq entry extraction failed" >&2; exit 1; }

printf '%s\n' "$entries" | while IFS="$(printf '\t')" read -r target agent status pane; do
  [ -n "$target" ] || continue
  if [ "$MODEL" -eq 1 ]; then
    raw=$(herdr pane read "$pane" --source visible 2>/dev/null | tail -n 25) || raw=""
    parsed=$(workers_parse_footer "$agent" "$raw")
    model=$(printf '%s\n' "$parsed" | cut -f1)
    effort=$(printf '%s\n' "$parsed" | cut -f2)
    [ -n "$model" ] || model='?'
    [ -n "$effort" ] || effort='?'
    printf '%s %s %s %s %s\n' "$target" "$agent" "$status" "$model" "$effort"
  else
    printf '%s %s %s\n' "$target" "$agent" "$status"
  fi
done