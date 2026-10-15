#!/bin/sh
# Parse a consistent model footer from an agent's visible terminal output.
workers_parse_footer() {
  printf '%s\n' "$2" | awk -v kind="$1" '
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
  '
}
