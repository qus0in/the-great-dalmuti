#!/bin/sh
# Usage: check.sh [dist-dir]   (default: <repo>/dist)
# Lint the HTML/CSS prototype against the ui-prototype contract.
# Exit 0 + "ok"; 1 with file:line violation list; 2 usage.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
[ $# -le 1 ] || { echo "usage: $0 [dist-dir]" >&2; exit 2; }
DIST=${1:-"$ROOT/dist"}
[ -d "$DIST" ] || { echo "no such dir: $DIST" >&2; exit 2; }
VF=$(mktemp) || { echo "mktemp failed" >&2; exit 1; }
WF=$(mktemp) || { echo "mktemp failed" >&2; exit 1; }
trap 'rm -f "$VF" "$WF"' EXIT INT TERM
v() { printf '%s:%s: %s\n' "$1" "$2" "$3" >> "$VF"; }
w() { printf 'warn %s:%s: %s\n' "$1" "$2" "$3" >> "$WF"; }
hits() { grep -inE "$1" "$2" 2>/dev/null || true; }
# report <file> <extended-regex> <message> : one violation per matching line
report() {
  while IFS= read -r h; do
    [ -n "$h" ] || continue
    v "$1" "${h%%:*}" "$3"
  done <<EOF
$(hits "$2" "$1")
EOF
}

for f in "$DIST"/*.html; do
  [ -e "$f" ] || continue
  report "$f" '(^|[^A-Za-z0-9_-])<(script|style)([[:space:]>])' 'inline <script>/<style> not allowed'
  report "$f" '(^|[^A-Za-z0-9_-])style[[:space:]]*=' 'style= attribute not allowed'
  report "$f" '(^|[^A-Za-z0-9_-])on[a-z]+[[:space:]]*=' 'on*= attribute not allowed'
  report "$f" '<(img|picture|image)([[:space:]>])' 'image element not allowed'
  grep -in 'reset\.css' "$f" | head -1 | cut -d: -f1 | grep -q '^[0-9]' || v "$f" 0 'missing reset.css link'
  grep -in 'tokens\.css' "$f" | head -1 | cut -d: -f1 | grep -q '^[0-9]' || v "$f" 0 'missing tokens.css link'
  clean=$(sed -E 's/(href|src|id|for|aria-[a-z-]+|data-[a-z-]+)="#[^"]*"//g' "$f")
  scan=$(printf '%s\n' "$clean" | sed -E "/<meta[^>]*name=[\"']theme-color[\"']/s/content=[\"']#[0-9a-fA-F]*[\"']//")
  while IFS= read -r h; do
    [ -n "$h" ] || continue
    v "$f" "${h%%:*}" 'color literal outside dist/css/tokens.css'
  done <<EOF
$(printf '%s\n' "$scan" | grep -inE '(#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{4}([^0-9a-fA-F]|$)|#[0-9a-fA-F]{3}([^0-9a-fA-F]|$)|rgba?\(|hsla?\()' || true)
EOF
  # image href allow-list: site icons + absolute-https og.png only
  while IFS= read -r h; do
    [ -n "$h" ] || continue
    ln=${h%%:*}; line=${h#*:}
    href=$(printf '%s' "$line" | grep -oE 'href="[^"]+"' | head -n 1 | sed -E 's/^href="//; s/"$//')
    case "$href" in
      *.png|*.jpg|*.jpeg|*.gif|*.webp|*.svg|*.ico)
        case "${href##*/}" in
          favicon.ico|favicon.svg|apple-touch-icon.png|icon-192.png|icon-512.png|icon-512-maskable.png) ;;
          *) v "$f" "$ln" "image reference outside allow-list: $href";;
        esac
        ;;
    esac
  done <<EOF
$(grep -inE '<link[^>]*href="[^"]+"' "$f" || true)
EOF
  # og/twitter image metas must be absolute https og.png
  while IFS= read -r h; do
    [ -n "$h" ] || continue
    ln=${h%%:*}; line=${h#*:}
    url=$(printf '%s' "$line" | grep -oE 'content="[^"]+"' | head -n 1 | sed -E 's/^content="//; s/"$//')
    case "$url" in
      https://*og.png*) ;;
      *) v "$f" "$ln" "og/twitter image must be absolute https og.png, got: $url";;
    esac
  done <<EOF
$(grep -inE '<meta[^>]*property="(og:image|twitter:image)"' "$f" || true)
EOF
  # required head elements (file-level, line 0)
  grep -qi '<meta[^>]*name="viewport"' "$f" || v "$f" 0 'missing <meta name="viewport">'
  grep -qi '<html[^>]*lang=' "$f" || v "$f" 0 'missing lang= on <html>'
  grep -qi '<meta[^>]*property="og:image"' "$f" || v "$f" 0 'missing og:image meta'
  grep -qi '<meta[^>]*name="twitter:card"' "$f" || v "$f" 0 'missing twitter:card meta'
done

for f in "$DIST"/css/*.css; do
  [ -e "$f" ] || continue
  bn=$(basename "$f")
  while IFS= read -r h; do
    [ -n "$h" ] || continue
    ln=${h%%:*}; rest=${h#*:}
    if [ "$bn" = tokens.css ]; then
      case "$rest" in *src:*) ;; *) v "$f" "$ln" 'url() in tokens.css is not a font src';; esac
    else
      v "$f" "$ln" 'url() outside dist/css/tokens.css (fonts only, in tokens.css)'
    fi
  done <<EOF
$(hits 'url\(' "$f")
EOF
  [ "$bn" = tokens.css ] && continue
  report "$f" '(#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{4}([^0-9a-fA-F]|$)|#[0-9a-fA-F]{3}([^0-9a-fA-F]|$)|rgba?\(|hsla?\()' 'color literal outside dist/css/tokens.css'
  while IFS= read -r h; do
    [ -n "$h" ] || continue
    ln=${h%%:*}; val=${h#*:}
    prop=$(printf '%s' "$val" | sed -E 's/^[^a-z]*([a-z-]+).*/\1/; s/-.*//')
    stripped=$(printf '%s' "$val" | sed -E 's/var\(--space-[^)]*\)//g')
    pxs=$(printf '%s\n' "$stripped" | grep -oE '[0-9]+(\.[0-9]+)?px' || true)
    for p in $pxs; do
      n=${p%px}
      [ "$n" = 0 ] && continue
      v "$f" "$ln" "px in spacing property ($p) outside tokens.css; use var(--space-*)"
      break
    done
    if [ "$prop" = margin ] && printf '%s' "$stripped" | grep -qE '\-[0-9.]|\-[a-zA-Z_]+\(|-$'; then
      v "$f" "$ln" "negative margin outside tokens.css; fix overlap via transform/grid"
    fi
  done <<EOF
$(hits '(^|[;{])[[:space:]]*(margin|padding|gap|row-gap|column-gap|inset)(-[a-z]+)?[[:space:]]*:' "$f")
EOF
  # warn-level heuristics (review only, never fail): clipping containers,
  # negative Korean-body tracking, buttons without min-height
  awk -v file="$f" '
    /\{/ { selector=$0; sub(/\{.*/, "", selector); sub(/^ +/, "", selector); selstart=FNR; hasmin=0; next }
    /^\}/ || /\}[[:space:]]*$/ {
      if (selector ~ /^\.btn([[:space:],{|]|$)/ && !hasmin)
        printf "warn %s:%d: button rule without min-height (48px target): %s\n", file, selstart, selector
      selector=""; next
    }
    selector == "" { next }
    /min-height/ { hasmin=1 }
    /overflow(-[xy])?[ \t]*:[ \t]*(hidden|clip)/ && selector !~ /sr-only/ {
      s2=selector; sub(/^ +/, "", s2)
      printf "warn %s:%d: overflow clipping on %s — card containers must not clip (pad intentional scrollers)\n", file, FNR, s2
    }
    /letter-spacing[ \t]*:[ \t]*-/ && selector ~ /(^|[^a-zA-Z-])(body|p|small)([^a-zA-Z-]|$)/ {
      s2=selector; sub(/^ +/, "", s2)
      printf "warn %s:%d: negative letter-spacing on %s (keep 0 for Korean body)\n", file, FNR, s2
    }
  ' "$f" >> "$WF"
done

if [ -s "$VF" ]; then
  sort -u "$VF"
  [ -s "$WF" ] && sort -u "$WF"
  exit 1
fi
[ -s "$WF" ] && sort -u "$WF"
echo ok
exit 0
