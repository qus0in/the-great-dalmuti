#!/bin/sh
# Usage: check.sh [root]
# Layer/import gate + line gate for src/{ui,app,domain,infra}. Skip if src/ absent.
# Prints "ok" or "<file>: <problem>"; exit 1 on problem.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)
BASE=${1:-$ROOT}
SRC="$BASE/src"
[ -d "$SRC" ] || { echo ok; exit 0; }

CODIFY="$ROOT/.agents/skills/codify/scripts/lines.sh"
V=$(mktemp); L=$(mktemp)
trap 'rm -f "$V" "$L"' EXIT INT TERM
bad(){ printf '%s\n' "$*" >>"$V"; }

layer_of() { case "$1" in ui/*|ui) printf ui;; app/*|app) printf app;; domain/*|domain) printf domain;; infra/*|infra) printf infra;; esac; }
allowed() { case "$1:$2" in ui:ui|ui:app|app:app|app:domain|infra:infra|infra:app|infra:domain|domain:domain) return 0;; *) return 1;; esac; }
norm_rel() { p=$1/$2; res=; while [ -n "$p" ]; do case "$p" in */*) c=${p%%/*}; rest=${p#*/};; *) c=$p; rest=;; esac; [ "$c" = . ] && { p=$rest; continue; }; if [ "$c" = .. ]; then case "$res" in */*) res=${res%/*};; *) res=;; esac; p=$rest; continue; fi; if [ -z "$res" ]; then res=$c; else res=$res/$c; fi; p=$rest; done; printf '%s' "$res"; }

find "$SRC" -type f | sort | while IFS= read -r f; do
  case "$f" in *.js|*.mjs|*.ts|*.tsx|*.jsx) ;; *) continue;; esac
  rel=${f#"$SRC"/}
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