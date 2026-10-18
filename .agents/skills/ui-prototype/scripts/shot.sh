#!/bin/sh
# Usage: shot.sh [out-dir] [pages...]; src/ui/public uses HTTP, dist keeps file URLs.
# Phone widths use a centered iframe and crop; prints PNG paths. Exit 0 ok, 1 failure, 2 usage.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
case "${1:-}" in
  -h|--help) echo "usage: $0 [out-dir] [pages...]" >&2; exit 2;;
  *.html|"") OUT=$(mktemp -d) || exit 1; printf 'using out-dir: %s\n' "$OUT" >&2;;
  *) OUT=$1; shift;;
esac
PAGES=""
if [ $# -gt 0 ]; then
  for p in "$@"; do
    [ -n "$p" ] || { echo "empty page arg" >&2; exit 2; }
    PAGES="$PAGES$p "
  done
else
  for p in "$ROOT"/dist/*.html; do [ ! -e "$p" ] || PAGES="$PAGES$p "; done
fi
[ -n "$PAGES" ] || { echo "no pages found" >&2; exit 1; }
[ -e "$CHROME" ] || { echo "chrome not found: $CHROME" >&2; exit 1; }
mkdir -p "$OUT" || exit 1
STATE=$(mktemp -d) || exit 1
server_pid=""
cleanup() {
  if [ -n "$server_pid" ]; then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi
  rm -rf "$STATE"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
start_http() {
  python3 -u -m http.server 0 --bind 127.0.0.1 --directory "$ROOT/src/ui/public" >"$STATE/http.log" 2>&1 &
  server_pid=$!; tries=0; port=""
  while [ "$tries" -lt 50 ]; do
    port=$(sed -nE 's/.* port ([0-9]+) .*/\1/p' "$STATE/http.log" | head -1)
    [ -z "$port" ] || break
    kill -0 "$server_pid" 2>/dev/null || break
    sleep 0.1; tries=$((tries + 1))
  done
  [ -n "$port" ] || { cat "$STATE/http.log" >&2; return 1; }
  printf 'serving http://127.0.0.1:%s (pid %s)\n' "$port" "$server_pid" >&2
}
rc=0
for p in $PAGES; do
  if [ ! -f "$p" ]; then echo "page not found: $p" >&2; rc=1; continue; fi
  abs=$(cd "$(dirname "$p")" && pwd)/$(basename "$p")
  name=$(basename "$p" .html); page_url="file://$abs"
  case "$abs" in "$ROOT/src/ui/public/"*)
    if [ -z "$server_pid" ]; then start_http || exit 1; fi
    page_url="http://127.0.0.1:$port/${abs#"$ROOT/src/ui/public/"}";;
  esac
  for size in 390,844 360,780 820,1180 1180,820 1440,900; do
    w=${size%,*}; h=${size#*,}; out="$OUT/$name-${w}x${h}.png"
    rm -f "$out"
    target="$page_url"; winsize="$size"; crop=0; raw="$out"
    if [ "$w" -lt 500 ]; then
      left=$(( (500 - w) / 2 )); harness="$STATE/harness.html"
      {
        printf '%s\n' '<!doctype html><html><head><meta charset="utf-8"><style>'
        printf 'html,body{margin:0;padding:0;background:#fff}iframe{display:block;position:absolute;left:%spx;top:0;width:%spx;height:%spx;border:0}\n' "$left" "$w" "$h"
        printf '%s\n' '</style></head><body>'
        printf '<iframe src="%s"></iframe></body></html>\n' "$page_url"
      } > "$harness"
      target="file://$harness"; winsize="500,$h"; crop=1; raw="$STATE/raw.png"; rm -f "$raw"
    fi
    "$CHROME" --headless=new --hide-scrollbars --user-data-dir="$STATE/profile" --window-size="$winsize" \
      --virtual-time-budget=3000 --screenshot="$raw" "$target" >/dev/null 2>"$STATE/chrome.err" || true
    if [ "$crop" -eq 1 ] && [ -s "$raw" ]; then
      sips -c "$h" "$w" "$raw" --out "$out" >/dev/null 2>&1 || { echo "crop failed: $p ($size)" >&2; rm -f "$out"; }
    fi
    if [ -s "$out" ]; then printf '%s\n' "$out"
    else echo "screenshot failed: $p ($size)" >&2; sed 's/^/  chrome: /' "$STATE/chrome.err" >&2; rc=1; fi
  done
done
exit "$rc"
