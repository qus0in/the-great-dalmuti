#!/bin/sh
# Parse a consistent model footer from an agent's visible terminal output.
workers_parse_footer() {
  printf '%s\n' "$2" | awk -v kind="$1" '
      function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
      function known(s) { return s ~ /^(minimal|low|medium|high|xhigh|max)$/ }
      function join(a, n,   i, s) { s = a[1]; for (i = 2; i <= n; i++) s = s " " a[i]; return s }
      # Codex: "<model> <effort>[ fast] · <path> · <title>"; effort must be a known value.
      function codex(l,   line, head, p, n, i, j) {
        if (l !~ /^[ \t]+[^·]+·/) return ""
        line = trim(l); head = line; sub(/[ \t]*·.*$/, "", head)
        n = split(head, p, /[ \t]+/)
        for (i = 2; i <= n; i++) {
          if (!known(p[i])) continue
          for (j = i + 1; j <= n; j++) if (p[j] != "fast") return ""
          return join(p, i - 1) "\t" p[i]
        }
        return ""
      }
      # OpenCode: box border then "Build[ auto] · <model> · <effort>".
      # The old "... OpenCode · effort" form parses the same way.
      function opencode(l,   line, p, n) {
        if (l !~ /^[ \t]*[┃|][ \t]+Build( auto)?[ \t]*·/) return ""
        line = l; sub(/^[ \t]*[┃|][ \t]+Build( auto)?[ \t]*·[ \t]*/, "", line)
        n = split(trim(line), p, /[ \t]*·[ \t]*/)
        if (n >= 2 && p[n] != "") return join(p, n - 1) "\t" p[n]
        return (p[1] != "") ? p[1] "\tnone" : ""
      }
      # AGY: status line ending with "accept-edits · <model> · <effort>".
      function agy(l,   line, model, e) {
        if (l !~ /^[ \t]*(\? for shortcuts|esc to cancel)[ \t]+.*accept-edits[ \t]*·/) return ""
        line = l; sub(/^.*accept-edits[ \t]*·[ \t]*/, "", line)
        if (line !~ /^[ \t]*[^·]+[ \t]*·[ \t]*[a-zA-Z0-9_-]+[ \t]*$/) return ""
        model = line; sub(/[ \t]*·[ \t]*[^·]*$/, "", model)
        e = line; sub(/^.*·[ \t]*/, "", e)
        return (trim(model) != "") ? trim(model) "\t" trim(e) : ""
      }
      {
        if (NR == 1) text = $0
        else text = text "\n" $0
      }
      END {
        n = split(text, lines, "\n"); count = 0; conflict = 0
        for (i = 1; i <= n; i++) {
          if (kind == "codex") got = codex(lines[i])
          else if (kind == "opencode") got = opencode(lines[i])
          else if (kind == "agy") got = agy(lines[i])
          else got = ""
          if (got == "") continue
          if (count == 0) first = got
          else if (got != first) conflict = 1
          count++
        }
        print (count > 0 && conflict == 0) ? first : "?\t?"
      }
  '
}
