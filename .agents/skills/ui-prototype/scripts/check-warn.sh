#!/bin/sh
# Usage: check-warn.sh [css-file-or-dir]...
# Heuristic review hints for prototype stylesheets (clipping containers,
# negative Korean-body tracking, buttons without min-height). Review only.
# stdout: "warn file:line: msg" lines. Exit 0 always (2 usage/missing).
set -u

die() { rc=$1; shift; echo "check-warn.sh: $*" >&2; exit "$rc"; }
usage() { echo "usage: $0 [css-file-or-dir]..." >&2; exit 2; }

warn_file() { # $1 = css file; single pass, handles one-line and split rules
  awk -v file="$1" '
    function checkdecl(d, ln) {
      if (d ~ /min-height/) hasmin = 1
      if (d ~ /overflow(-[xy])?[ \t]*:[ \t]*(hidden|clip)/ && selector !~ /sr-only/)
        printf "warn %s:%d: overflow clipping on %s — card containers must not clip (pad intentional scrollers)\n", file, ln, selector
      if (d ~ /letter-spacing[ \t]*:[ \t]*-/ && selector ~ /(^|[^a-zA-Z-])(body|p|small)([^a-zA-Z-]|$)/)
        printf "warn %s:%d: negative letter-spacing on %s (keep 0 for Korean body)\n", file, ln, selector
    }
    function closeblock(ln) {
      if (selector ~ /^\.btn([[:space:],{|]|$)/ && !hasmin)
        printf "warn %s:%d: button rule without min-height (48px target): %s\n", file, ln, selector
      selector = ""
    }
    {
      line = $0
      if (match(line, /\{/)) {
        selector = substr(line, 1, RSTART - 1); sub(/^ +/, "", selector)
        selstart = FNR; hasmin = 0
        rest = substr(line, RSTART + 1)
        if (match(rest, /\}/)) { checkdecl(substr(rest, 1, RSTART - 1), FNR); closeblock(selstart); next }
        checkdecl(rest, FNR); next
      }
      if (match(line, /\}/)) { checkdecl(substr(line, 1, RSTART - 1), FNR); closeblock(selstart); next }
      checkdecl(line, FNR)
    }
  ' "$1"
}

scan_dir() { # $1 = dir: recursive *.css, sorted, space-safe paths
  find "$1" -type f -name '*.css' | LC_ALL=C sort | while IFS= read -r f; do
    [ -n "$f" ] || continue
    warn_file "$f"
  done
}
if [ $# -eq 0 ]; then
  HERE=$(cd "$(dirname "$0")" && pwd)
  ROOT=$(cd "$HERE/../../../.." && pwd)
  [ -d "$ROOT/dist/css" ] || exit 0
  scan_dir "$ROOT/dist/css"
  exit 0
fi
for arg in "$@"; do
  case "$arg" in
    -*) usage;;
    *)
      if [ -d "$arg" ]; then
        scan_dir "$arg"
      elif [ -f "$arg" ]; then
        warn_file "$arg"
      else
        die 2 "not found: '$arg'"
      fi
      ;;
  esac
done
exit 0
