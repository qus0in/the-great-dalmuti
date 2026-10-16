#!/bin/sh
# Usage: check-css.sh [css-file-or-dir]...   (default: <repo>/dist/css)
# Lint prototype stylesheets (violations only; hints live in check-warn.sh).
# stdout: "file:line: msg" list. Exit 0 + "ok", 1 violations, 2 usage/missing.
set -u
die() { rc=$1; shift; echo "check-css.sh: $*" >&2; exit "$rc"; }
usage() { echo "usage: $0 [css-file-or-dir]..." >&2; exit 2; }
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
FILES=""
[ $# -gt 0 ] || set -- "$ROOT/dist/css"
for arg in "$@"; do
  case "$arg" in -*) usage;;
    *) if [ -d "$arg" ]; then
         for f in $(find "$arg" -type f -name '*.css'); do [ -e "$f" ] && FILES="$FILES$f "; done
       elif [ -f "$arg" ]; then FILES="$FILES$arg ";
       else die 2 "not found: '$arg'"; fi;;
  esac
done
[ -n "$FILES" ] || { echo ok; exit 0; }
VF=$(mktemp) || die 1 "mktemp failed"
trap 'rm -f "$VF"' EXIT INT TERM
v() { printf '%s:%s: %s\n' "$1" "$2" "$3" >> "$VF"; }
hits() { grep -inE "$1" "$2" 2>/dev/null || true; }
for f in $FILES; do
  [ -n "$f" ] || continue
  bn=$(basename "$f")
  is_03=0; case "$f" in *src/ui/public*|*src/ui*|*s23-probe*) is_03=1;; esac
  brand_lines=""
  if [ "$is_03" -eq 1 ]; then
    brand_lines=$(awk '
      BEGIN { in_b = 0; p = 0; }
      {
        if ($0 ~ /\/\*[[:space:]]*brand:[[:space:]]*https?:\/\/[^[:space:]]+[[:space:]]*\*\//) { p = 2; b[NR] = 1; }
        if (p > 0) { b[NR] = 1; if ($0 ~ /\{/) { in_b = 1; p = 0; } else { p--; } }
        else if (in_b) { b[NR] = 1; }
        if (in_b && $0 ~ /\}/) { in_b = 0; }
      }
      END { for (l in b) printf " %s ", l; }
    ' "$f" 2>/dev/null || true)
  fi
  while IFS= read -r h; do
    [ -n "$h" ] || continue; ln=${h%%:*}; rest=${h#*:}
    if [ "$bn" = tokens.css ]; then
      case "$rest" in *src:*) ;; *) v "$f" "$ln" 'url() in tokens.css is not a font src';; esac
    else
      v "$f" "$ln" 'url() outside dist/css/tokens.css (fonts only, in tokens.css)'
    fi
  done <<EOF
$(hits 'url\(' "$f")
EOF
  [ "$bn" = tokens.css ] && continue
  while IFS= read -r h; do
    [ -n "$h" ] || continue; ln=${h%%:*}
    case "$brand_lines" in *" $ln "*) continue;; esac
    v "$f" "$ln" 'color literal outside dist/css/tokens.css'
  done <<EOF
$(hits '(#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{4}([^0-9a-fA-F]|$)|#[0-9a-fA-F]{3}([^0-9a-fA-F]|$)|rgba?\(|hsla?\()' "$f")
EOF
  while IFS= read -r h; do
    [ -n "$h" ] || continue; ln=${h%%:*}; val=${h#*:}
    case "$brand_lines" in *" $ln "*) continue;; esac
    prop=$(printf '%s' "$val" | sed -E 's/^[^a-z]*([a-z-]+).*/\1/; s/-.*//')
    stripped=$(printf '%s' "$val" | sed -E 's/var\(--space-[^)]*\)//g')
    units=$(printf '%s\n' "$stripped" | grep -oE '[0-9]+(\.[0-9]+)?(px|r?em)' || true)
    for u in $units; do
      case "$u" in
        *px) n=${u%px}; [ "$n" = 0 ] && continue
          v "$f" "$ln" "px in spacing property ($u) outside tokens.css; use var(--space-*)"; break;;
        *) n=${u%rem}; [ "$u" = "$n" ] && n=${u%em}
          case "$n" in 0|0.0) continue;; esac
          v "$f" "$ln" "non-token rem/em spacing ($u) outside tokens.css; use var(--space-*)"; break;;
      esac
    done
    if [ "$prop" = margin ] && printf '%s' "$stripped" | grep -qE '\-[0-9.]|\-[a-zA-Z_]+\(|-$'; then
      v "$f" "$ln" "negative margin outside tokens.css; fix overlap via transform/grid"
    fi
  done <<EOF
$(hits '(^|[;{])[[:space:]]*(margin|padding|gap|row-gap|column-gap|inset)(-[a-z]+)?[[:space:]]*:' "$f")
EOF
done
if [ -s "$VF" ]; then sort -u "$VF"; exit 1; fi
echo ok
exit 0
