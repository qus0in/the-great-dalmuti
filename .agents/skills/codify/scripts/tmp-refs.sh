#!/bin/sh
# Usage: tmp-refs.sh [paths...] — reject concrete task paths; allow directory/template/glob notation.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
[ $# -gt 0 ] || set -- "$ROOT/AGENTS.md" "$ROOT/docs" "$ROOT/.agents/skills"
LOG=$(mktemp) || exit 2
trap 'rm -f "$LOG"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
find "$@" -type f -exec awk '
{
  rest=$0
  while (match(rest, /(^|[^[:alnum:]_])tmp\/[^[:space:]`\047"<>()]+/)) {
    token=substr(rest,RSTART,RLENGTH)
    rest=substr(rest,RSTART+RLENGTH)
    sub(/^[^[:alnum:]_]?tmp\//,"",token)
    sub(/[],;:.)]+$/,"",token)
    split(token,parts,"/")
    # Concrete first component only: variable, placeholder and glob task names are usage notation.
    if (parts[1] ~ /^[[:alnum:]][[:alnum:]_.-]*$/)
      print FILENAME ":" FNR ": concrete temporary reference: tmp/" token
  }
}' {} + > "$LOG" || exit 2
if [ -s "$LOG" ]; then cat "$LOG"; exit 1; fi
echo ok
