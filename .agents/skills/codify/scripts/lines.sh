#!/bin/sh
# Usage: lines.sh [--max N] [paths...]
# Verify non-doc, non-binary code files do not exceed line limit (default: 100 lines).
# paths may be files or directories (directories are walked); no paths = repo-wide scan.
# Skips docs, markdown, binaries, assets, data, and conf-declared patterns (LINES_EXEMPT_PATTERNS; empty conf = none).
# Exit 0 + "ok"; exit 1 with "<lines> <path>" on violations; exit 2 on usage error.
set -euf

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)
CONF="$ROOT/.agents/project.conf"
if [ -f "$CONF" ]; then . "$CONF"; fi

MAX=100

usage() {
  echo "usage: $0 [--max N] [paths...]" >&2
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --max)
      [ $# -ge 2 ] || usage
      MAX=$2; shift 2 ;;
    --max=*)
      MAX=${1#--max=}; shift ;;
    -h|--help)
      usage ;;
    --)
      shift; break ;;
    -*)
      usage ;;
    *)
      break ;;
  esac
done

case "$MAX" in
  ''|*[!0-9]*) usage ;;
  *) [ "$MAX" -gt 0 ] 2>/dev/null || usage ;;
esac

cd "$ROOT"

is_exempt() {
  case "$1" in
    tmp/*|*/tmp/*) return 0 ;;
    *.md|*/README*|README*) return 0 ;;
    docs/*|*/docs/*) return 0 ;;
    *.png|*.ico|*.jpg|*.jpeg|*.gif|*.webp|*.woff|*.woff2|*.pdf) return 0 ;;
    *.svg|*.webmanifest|*.json) return 0 ;;
    *) ;;
  esac
  for pat in ${LINES_EXEMPT_PATTERNS:-}; do
    case "$1" in $pat) return 0 ;; esac
  done
  return 1
}

rc=0

check_file() {
  f=$1
  [ -f "$f" ] || return 0
  is_exempt "$f" && return 0
  count=$(awk 'END {print NR+0}' "$f")
  if [ "$count" -gt "$MAX" ]; then
    printf '%d %s\n' "$count" "$f"
    rc=1
  fi
}

LIST=$(mktemp) || exit 1
trap 'rm -f "$LIST"' EXIT INT TERM

if [ $# -gt 0 ]; then
  for p in "$@"; do
    if [ -d "$p" ]; then
      find "$p" -type f | sort
    else
      printf '%s\n' "$p"
    fi
  done > "$LIST"
else
  git ls-files -co --exclude-standard > "$LIST" 2>/dev/null || { echo "lines.sh: git required for repo-wide scan" >&2; exit 2; }
fi

while IFS= read -r f; do
  [ -n "$f" ] || continue
  check_file "$f"
done < "$LIST"
rm -f "$LIST"
trap - EXIT INT TERM

if [ "$rc" -eq 0 ]; then
  echo ok
fi
exit "$rc"
