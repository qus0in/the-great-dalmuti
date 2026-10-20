#!/bin/sh
# Usage: summary.sh <report-path>...
# Print only the head summary block of each report so the orchestrator can read
# results without loading full text. Block = the first "status:|verdict:|blocking:|summary:"
# line found in the first 20 lines, plus at most 3 indented continuation lines.
# Without a block: first line + up to 5 "판정|차단|status" lines from the
# "## 결과"/"# 결과"/"## Result" section, then the marker "(no summary block)".
# Output cap: 8 lines per file (path header included). Missing file -> stderr + exit 1.
set -u
[ $# -ge 1 ] || { echo "usage: $0 <report-path>..." >&2; exit 2; }
rc=0
for f in "$@"; do
  if [ ! -f "$f" ]; then
    echo "summary: missing file: $f" >&2
    rc=1
    continue
  fi
  awk '
  { L[NR] = $0 }
  END {
    CAP = 7; n = 0; bs = 0
    for (i = 1; i <= NR && i <= 20; i++)
      if (L[i] ~ /^(status|verdict|blocking|summary):/) { bs = i; break }
    if (bs > 0) {
      out[++n] = L[bs]; cont = 0
      for (i = bs + 1; i <= NR; i++) {
        l = L[i]
        if (l ~ /^(status|verdict|blocking|summary):/) { if (n >= CAP) break; out[++n] = l; continue }
        if (l ~ /^[ \t]/) { if (cont >= 3 || n >= CAP) break; cont++; out[++n] = l; continue }
        break
      }
    } else {
      out[++n] = L[1]; hits = 0; sec = 0
      for (i = 2; i <= NR; i++) {
        l = L[i]
        if (l ~ /^#+[[:space:]]*(결과|Result)/) { sec = 1; continue }
        if (sec && l ~ /^#/) sec = 0
        if (sec && l ~ /(판정|차단|status)/) { if (hits >= 5 || n >= CAP) break; hits++; out[++n] = l }
      }
      out[++n] = "(no summary block)"
    }
    print "== " FILENAME
    for (i = 1; i <= n; i++) print out[i]
  }' "$f" || rc=1
done
exit $rc
