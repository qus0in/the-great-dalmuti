#!/bin/sh
# Usage: check.sh [root]
# Layer/import gate + line gate for src/. Skip if src/ absent.
# Layer set, allowed pairs and outside files come from .agents/project.conf (sourced below);
# empty/missing conf = generic defaults (no layers recognized -> only the line gate runs).
# Prints "ok" or "<file>: <problem>"; exit 1 on problem.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)
CONF="$ROOT/.agents/project.conf"
if [ -f "$CONF" ]; then . "$CONF"; fi
LAYERS=${LAYERS:-}
LAYER_DEPS=${LAYER_DEPS:-}
LAYER_OUTSIDE=${LAYER_OUTSIDE:-}
BASE=${1:-$ROOT}
SRC="$BASE/src"
[ -d "$SRC" ] || { echo ok; exit 0; }

CODIFY="$ROOT/.agents/skills/codify/scripts/lines.sh"
V=$(mktemp); L=$(mktemp)
trap 'rm -f "$V" "$L"' EXIT INT TERM
bad(){ printf '%s\n' "$*" >>"$V"; }

layer_of() { for l in $LAYERS; do case "$1" in ${l}|${l}/*) printf '%s' "$l"; return 0;; esac; done; return 1; }
allowed() { for p in $LAYER_DEPS; do [ "$p" = "$1:$2" ] && return 0; done; return 1; }
norm_rel() { p=$1/$2; res=; while [ -n "$p" ]; do case "$p" in */*) c=${p%%/*}; rest=${p#*/};; *) c=$p; rest=;; esac; [ "$c" = . ] && { p=$rest; continue; }; if [ "$c" = .. ]; then case "$res" in */*) res=${res%/*};; *) res=;; esac; p=$rest; continue; fi; if [ -z "$res" ]; then res=$c; else res=$res/$c; fi; p=$rest; done; printf '%s' "$res"; }

find "$SRC" -type f | sort | while IFS= read -r f; do
  case "$f" in *.js|*.mjs|*.ts|*.tsx|*.jsx) ;; *) continue;; esac
  rel=${f#"$SRC"/}
  # Files declared outside layers in .agents/project.conf (LAYER_OUTSIDE) are skipped.
  for skip in $LAYER_OUTSIDE; do
    [ "$rel" = "$skip" ] && continue 2
  done
  sl=$(layer_of "$rel"); [ -n "$sl" ] || continue
  grep -nE "^[[:space:]]*(import|export)[[:space:]].*from[[:space:]]+['\"]" "$f" 2>/dev/null | while IFS= read -r line; do
    mod=$(printf '%s\n' "$line" | sed -nE "s/.*from[[:space:]]+['\"]([^'\"]+)['\"].*/\1/p")
    [ -n "$mod" ] || continue
    case "$mod" in
      ./*|../*)
        tg=$(norm_rel "$(dirname "$rel")" "$mod")
        tl=$(layer_of "$tg")
        [ -n "$tl" ] || bad "$f: import escapes src ($mod)"
        allowed "$sl" "$tl" || bad "$f: forbidden import $sl -> $tl ($mod)";;
      node:*)
        case "$f" in
          *.test.*|*_test.*) ;;
          *) [ "$sl" != domain ] || bad "$f: domain must not import external package ($mod)";;
        esac;;
      *)
        [ "$sl" != domain ] || bad "$f: domain must not import external package ($mod)";;
    esac
  done
done

[ -s "$V" ] && { cat "$V"; exit 1; }

find "$SRC" -type f ! -name '*.html' -print | sort > "$L"
set --
while IFS= read -r f; do [ -n "$f" ] && set -- "$@" "$f"; done < "$L"
if [ $# -gt 0 ]; then
  if ! out=$("$CODIFY" "$@" 2>&1); then printf '%s\n' "$out"; exit 1; fi
fi
echo ok
exit 0
