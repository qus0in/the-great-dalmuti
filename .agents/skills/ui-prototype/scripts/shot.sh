#!/bin/sh
# Usage: shot.sh [out-dir] [pages...]   (defaults: a fresh mktemp -d dir (printed), pages <repo>/dist/*.html)
# Headless Chrome screenshots each page at 390x844, 360x780, 820x1180, 1180x820 and 1440x900; prints PNG paths.
# Widths below 500px go through an iframe harness (Chrome clamps layout width): the harness is
# screenshotted at 500px wide with the iframe centered, then center-cropped to the exact size.
# Exit 0 ok; 1 Chrome/missing page/screenshot failure; 2 usage.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
case "${1:-}" in
  -h|--help) echo "usage: $0 [out-dir] [pages...]" >&2; exit 2;;
  *.html) OUT_AUTO=1;;
  "") OUT_AUTO=1;;
  *) OUT=$1; shift;;
esac
: "${OUT_AUTO:=0}"
if [ "$OUT_AUTO" -eq 1 ]; then
  OUT=$(mktemp -d) || { echo "mktemp failed" >&2; exit 1; }
  printf 'using out-dir: %s\n' "$OUT" >&2
fi
if [ $# -gt 0 ]; then
  PAGES=""
  for p in "$@"; do
    [ -n "$p" ] || { echo "empty page arg" >&2; exit 2; }
    PAGES="$PAGES$p "
  done
else
  PAGES=""
  for p in "$ROOT"/dist/*.html; do
    [ -e "$p" ] || continue
    PAGES="$PAGES$p "
  done
  [ -n "$PAGES" ] || { echo "no pages: $ROOT/dist/*.html not found" >&2; exit 1; }
fi
[ -e "$CHROME" ] || { echo "chrome not found: $CHROME" >&2; exit 1; }
mkdir -p "$OUT" || exit 1
rc=0
for p in $PAGES; do
  if [ ! -f "$p" ]; then echo "page not found: $p" >&2; rc=1; continue; fi
  abs=$(cd "$(dirname "$p")" && pwd)/$(basename "$p")
  name=$(basename "$p" .html)
  for size in 390,844 360,780 820,1180 1180,820 1440,900; do
    w=${size%,*}; h=${size#*,}
    out="$OUT/$name-${w}x${h}.png"
    errf=$(mktemp) || exit 1
    rm -f "$out"
    target="file://$abs"; winsize="$size"; crop=0; harness=""; raw="$out"
    if [ "$w" -lt 500 ]; then
      # Chrome clamps layout width: render through a centered exact-size iframe instead
      left=$(( (500 - w) / 2 ))
      harness="$OUT/.harness-$name-${w}x${h}.html"
      {
        printf '%s\n' '<!doctype html><html><head><meta charset="utf-8"><style>'
        printf 'html,body{margin:0;padding:0;background:#fff}iframe{display:block;position:absolute;left:%spx;top:0;width:%spx;height:%spx;border:0}\n' "$left" "$w" "$h"
        printf '%s\n' '</style></head><body>'
        printf '<iframe src="file://%s"></iframe></body></html>\n' "$abs"
      } > "$harness"
      target="file://$harness"; winsize="500,$h"; crop=1
      harness_abs=$(cd "$(dirname "$harness")" && pwd)/$(basename "$harness")
      target="file://$harness_abs"
      raw="$OUT/.raw-$name-${w}x${h}.png"
      rm -f "$raw"
    fi
    "$CHROME" --headless=new --hide-scrollbars --window-size="$winsize" \
      --virtual-time-budget=3000 --screenshot="$raw" "$target" >/dev/null 2>"$errf" || true
    if [ "$crop" -eq 1 ] && [ -s "$raw" ]; then
      if sips -c "$h" "$w" "$raw" --out "$out" >/dev/null 2>&1; then
        rm -f "$raw" "$harness"
      else
        echo "crop failed: $p ($size)" >&2
        rm -f "$out"
      fi
    fi
    if [ -s "$out" ]; then
      printf '%s\n' "$out"
    else
      echo "screenshot failed: $p ($size)" >&2
      sed 's/^/  chrome: /' "$errf" >&2
      rc=1
    fi
    rm -f "$errf"
  done
done
exit "$rc"
