#!/bin/sh
# Usage: check-img.sh [dist-dir]   (default: <repo>/dist)
# Lint prototype images (HTML img/picture/image elements and images/ directory).
# stdout: "file:line: msg" list. Exit 0 + "ok", 1 violations, 2 usage.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
[ $# -le 1 ] || { echo "usage: $0 [dist-dir]" >&2; exit 2; }
DIST=${1:-"$ROOT/dist"}
[ -d "$DIST" ] || { echo "no such dir: $DIST" >&2; exit 2; }
CANON=$(cd "$DIST" 2>/dev/null && pwd || printf '%s' "$DIST")
NORM=$(printf '%s' "$CANON" | sed 's:/*$::')
IS_03=0; case "$NORM" in */src/ui/public|*/src/ui/public/*|src/ui/public|src/ui/public/*) IS_03=1;; esac
VF=$(mktemp) || { echo "mktemp failed" >&2; exit 1; }
trap 'rm -f "$VF"' EXIT INT TERM
v() { printf '%s:%s: %s\n' "$1" "$2" "$3" >> "$VF"; }
hits() { grep -inE "$1" "$2" 2>/dev/null || true; }

get_attr() {
  _a=$1; _t=$2
  _m=$(printf '%s\n' "$_t" | grep -ioE "(^|[[:space:]])${_a}=(\"[^\"]*\"|'[^']*')" | head -n 1 || true)
  [ -n "$_m" ] || { printf '__MISSING__'; return; }
  printf '%s' "$_m" | sed -E 's/^[^=]*=['\''"]//; s/['\''"]$//'
}

valid_src() {
  case "$1" in
    images/avatar-silhouette.svg|/images/avatar-silhouette.svg|\
    images/avatar-bot.svg|/images/avatar-bot.svg) return 0;;
  esac
  printf '%s\n' "$1" | grep -qE '^https://[a-zA-Z0-9_-]+\.supabase\.co/storage/v1/object/public/avatars/[A-Za-z0-9_-]+(\.[A-Za-z0-9]+)?(/[A-Za-z0-9_-]+(\.[A-Za-z0-9]+)?)*$'
}

check_tag() {
  f=$1; ln=$2; rest=$3
  printf '%s\n' "$rest" | grep -qiE '<(picture|image)[[:space:]>]' && { v "$f" "$ln" 'image element not allowed'; return; }
  src=$(get_attr src "$rest")
  case "$src" in /images/google-g.svg|images/google-g.svg) return 0;; esac
  cls=$(get_attr class "$rest")
  if [ "$cls" != "avatar__img" ]; then
    v "$f" "$ln" 'image element not allowed'
    return
  fi
  alt=$(get_attr alt "$rest")
  [ "$alt" != "__MISSING__" ] || v "$f" "$ln" 'avatar__img missing alt attribute'
  w=$(get_attr width "$rest"); h=$(get_attr height "$rest")
  [ "$w" != "__MISSING__" ] && [ -n "$w" ] && [ "$h" != "__MISSING__" ] && [ -n "$h" ] || \
    v "$f" "$ln" 'avatar__img missing width or height attribute'
  if [ "$src" = "__MISSING__" ] || [ -z "$src" ]; then
    v "$f" "$ln" 'avatar__img missing or empty src attribute'
  elif ! valid_src "$src"; then
    v "$f" "$ln" "avatar__img src outside allow-list: $src"
  fi
}

for f in "$DIST"/*.html; do
  [ -e "$f" ] || continue
  if [ "$IS_03" -eq 1 ]; then
    while IFS= read -r h; do [ -n "$h" ] || continue; check_tag "$f" "${h%%:*}" "${h#*:}"; done <<EOF
$(hits '<(img|picture|image)([[:space:]>])' "$f")
EOF
  else
    while IFS= read -r h; do [ -n "$h" ] || continue; v "$f" "${h%%:*}" 'image element not allowed'; done <<EOF
$(hits '<(img|picture|image)([[:space:]>])' "$f")
EOF
  fi
done

if [ -d "$DIST/images" ]; then
  for img in "$DIST/images"/*; do
    [ -e "$img" ] || continue; bn=${img##*/}
    if [ "$IS_03" -eq 1 ]; then
      case "$bn" in google-g.svg|avatar-silhouette.svg|avatar-bot.svg) ;;
        *) v "$img" 0 "image file outside allow-list: $bn";; esac
    else
      v "$img" 0 "images directory not allowed in dist: $bn"
    fi
  done
fi

if [ -s "$VF" ]; then sort -u "$VF"; exit 1; fi
echo ok
exit 0
