#!/bin/sh
# Usage: workers.sh [--idle] [--model] [--workspace ID --self-pane ID]
# Output (default): <target> <agent> <status>
# Output (--model): <target> <agent> <status> <model> <effort>
# Note: <model> may be multi-word; <effort> is the final token ('none', '?', or effort name).
# List agents in this workspace excluding the current pane.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
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
    parsed=$(printf '%s\n' "$raw" | awk -v kind="$agent" '
      function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
      function parse_footer(agent_kind, raw_text) {
        n = split(raw_text, lines, "\n")
        cand_count = 0; conflict = 0
        first_model = ""; first_effort = ""
        for (i = 1; i <= n; i++) {
          l = lines[i]
          m = ""; eff = ""
          if (agent_kind == "opencode") {
            # Anchored to OpenCode UI box border: starts with optional spaces, vertical bar ┃ or |, spaces, Build auto ·
            if (l ~ /^[ \t]*[┃|][ \t]+Build auto[ \t]*·/) {
              line = l
              sub(/^[ \t]*[┃|][ \t]+Build auto[ \t]*·[ \t]*/, "", line)
              # line must end with OpenCode[ <provider>][ · <effort>]
              if (line ~ /OpenCode([ \t]+[^· \t]+)?([ \t]*·[ \t]*[a-zA-Z0-9_-]+)?[ \t]*$/) {
                model = line
                sub(/[ \t]*OpenCode.*$/, "", model)
                model = trim(model)
                effort = "none"
                if (line ~ /OpenCode[^·]*·/) {
                  e = line
                  sub(/^.*OpenCode[^·]*·[ \t]*/, "", e)
                  e = trim(e)
                  sub(/[ \t].*$/, "", e)
                  if (e ~ /^[a-zA-Z0-9_-]+$/) effort = e
                }
                if (model != "") {
                  m = model; eff = effort
                }
              }
            }
          } else if (agent_kind == "agy") {
            # Anchored to AGY status line: begins with known prefix ("esc to cancel" or "? for shortcuts")
            # and ends with accept-edits · <model> · <effort>
            if (l ~ /^[ \t]*(\? for shortcuts|esc to cancel)[ \t]+.*accept-edits[ \t]*·/) {
              line = l
              sub(/^.*accept-edits[ \t]*·[ \t]*/, "", line)
              if (line ~ /^[ \t]*[^·]+[ \t]*·[ \t]*[a-zA-Z0-9_-]+[ \t]*$/) {
                model = line; sub(/[ \t]*·[ \t]*[^·]*$/, "", model)
                e = line; sub(/^.*·[ \t]*/, "", e)
                model = trim(model); e = trim(e)
                if (model != "" && e != "") {
                  m = model; eff = e
                }
              }
            }
          }
          if (m != "") {
            if (cand_count == 0) {
              first_model = m; first_effort = eff
            } else {
              if (m != first_model || eff != first_effort) {
                conflict = 1
              }
            }
            cand_count++
          }
        }
        if (cand_count > 0 && conflict == 0) return first_model "\t" first_effort
        return "?\t?"
      }
      {
        if (NR == 1) all_text = $0
        else all_text = all_text "\n" $0
      }
      END {
        print parse_footer(kind, all_text)
      }
    ')
    model=$(printf '%s\n' "$parsed" | cut -f1)
    effort=$(printf '%s\n' "$parsed" | cut -f2)
    [ -n "$model" ] || model='?'
    [ -n "$effort" ] || effort='?'
    printf '%s %s %s %s %s\n' "$target" "$agent" "$status" "$model" "$effort"
  else
    printf '%s %s %s\n' "$target" "$agent" "$status"
  fi
done