#!/bin/sh
# Usage: check.sh [dist-dir]   (default: <repo>/dist)
# Lint prototype HTML; CSS via check-css.sh, warns via check-warn.sh. Exit 0 + "ok"; 1 violations; 2 usage.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
[ $# -le 1 ] || { echo "usage: $0 [dist-dir]" >&2; exit 2; }
DIST=${1:-"$ROOT/dist"}
[ -d "$DIST" ] || { echo "no such dir: $DIST" >&2; exit 2; }
IS_03=0; case "$DIST" in *src/ui/public*|*src/ui*|*s23-probe*) IS_03=1;; esac
VF=$(mktemp) || { echo "mktemp failed" >&2; exit 1; }
trap 'rm -f "$VF"' EXIT INT TERM
v() { printf '%s:%s: %s\n' "$1" "$2" "$3" >> "$VF"; }
hits() { grep -inE "$1" "$2" 2>/dev/null || true; }
report() { while IFS= read -r h; do [ -n "$h" ] || continue; v "$1" "${h%%:*}" "$3"; done <<EOF
$(hits "$2" "$1")
EOF
}
layer_of() {
  case "$1" in */tokens/*.css) printf 1;; */base/*.css) printf 2;; */components/*.css|components*.css) printf 3;; *) case "${1##*/}" in reset.css) printf 0;; tokens.css) printf 1;; base.css) printf 2;; components.css) printf 3;; *) printf 4;; esac;; esac
}
for f in "$DIST"/*.html; do
  [ -e "$f" ] || continue
  is_err=0; case "${f##*/}" in 404.html|50*.html) is_err=1;; esac
  if [ "$IS_03" -eq 1 ]; then
    report "$f" '(^|[^A-Za-z0-9_-])<style([[:space:]>])' 'inline <style> not allowed'
    while IFS= read -r h; do [ -n "$h" ] || continue; ln=${h%%:*}; tag=${h#*:}
      case "$tag" in
        *type=[\"\']module[\"\']*)
          case "$tag" in *src=*) ;;
            *) v "$f" "$ln" 'inline <script type="module"> not allowed (use external module src=)';; esac;;
        *) v "$f" "$ln" 'non-module script element not allowed';;
      esac
    done <<EOF
$(hits '<script([[:space:]>])' "$f")
EOF
    while IFS= read -r h; do [ -n "$h" ] || continue; ln=${h%%:*}; rest=${h#*:}
      case "$rest" in *google-g.svg*) ;; *) v "$f" "$ln" 'image element not allowed';; esac
    done <<EOF
$(hits '<(img|picture|image)([[:space:]>])' "$f")
EOF
  else
    report "$f" '(^|[^A-Za-z0-9_-])<(script|style)([[:space:]>])' 'inline <script>/<style> not allowed'
    report "$f" '<(img|picture|image)([[:space:]>])' 'image element not allowed'
  fi
  report "$f" '(^|[^A-Za-z0-9_-])style[[:space:]]*=' 'style= attribute not allowed'
  report "$f" '(^|[^A-Za-z0-9_-])on[a-z]+[[:space:]]*=' 'on*= attribute not allowed'
  hrefs=$(grep -oE 'href="[^"]+\.css"' "$f" | sed -E 's/^href="//; s/"$//' || true)
  for req in reset.css tokens.css; do
    printf '%s\n' "$hrefs" | grep -q "/$req$" || printf '%s\n' "$hrefs" | grep -qx "$req" || v "$f" 0 "missing $req link"
  done
  prev=-1; badorder=0; has_l2=0; has_l3=0; has_l4=0
  for h in $hrefs; do
    L=$(layer_of "$h"); [ "$L" -ge "$prev" ] || badorder=1; prev=$L
    case "$L" in 2) has_l2=1;; 3) has_l3=1;; 4) has_l4=1;; esac
  done
  [ "$has_l2" -eq 1 ] && [ "$has_l3" -eq 1 ] && { [ "$is_err" -eq 1 ] || [ "$has_l4" -eq 1 ]; } || v "$f" 0 'missing base, components or page CSS link'
  [ "$badorder" -eq 0 ] || v "$f" 0 'CSS link order must be reset, tokens, base, components*, page* (by layer)'
  clean=$(sed -E 's/(href|src|id|for|aria-[a-z-]+|data-[a-z-]+)="#[^"]*"//g' "$f" | sed -E "/<meta[^>]*name=[\"']theme-color[\"']/s/content=[\"'][^\"']*[\"']//")
  while IFS= read -r h; do [ -n "$h" ] || continue; v "$f" "${h%%:*}" 'color literal outside dist/css/tokens.css'; done <<EOF
$(printf '%s\n' "$clean" | grep -inE '(#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{4}([^0-9a-fA-F]|$)|#[0-9a-fA-F]{3}([^0-9a-fA-F]|$)|rgba?\(|hsla?\()' || true)
EOF
  while IFS= read -r h; do [ -n "$h" ] || continue
    href=$(printf '%s' "${h#*:}" | grep -oE 'href="[^"]+"' | head -n 1 | sed -E 's/^href="//; s/"$//')
    case "$href" in *.png|*.jpg|*.jpeg|*.gif|*.webp|*.svg|*.ico)
      case "${href##*/}" in favicon.ico|favicon.svg|apple-touch-icon.png|icon-192.png|icon-512.png|icon-512-maskable.png) ;;
        *) v "$f" "${h%%:*}" "image reference outside allow-list: $href";; esac;; esac
  done <<EOF
$(grep -inE '<link[^>]*href="[^"]+"' "$f" || true)
EOF
  if [ "$is_err" -eq 0 ]; then
    while IFS= read -r h; do [ -n "$h" ] || continue
      url=$(printf '%s' "${h#*:}" | grep -oE 'content="[^"]+"' | head -n 1 | sed -E 's/^content="//; s/"$//')
      case "$url" in https://*og.png*) ;; *) v "$f" "${h%%:*}" "og/twitter image must be absolute https og.png, got: $url";; esac
    done <<EOF
$(grep -inE '<meta[^>]*property="(og:image|twitter:image)"' "$f" || true)
EOF
  fi
  grep -qi '<meta[^>]*name="viewport"' "$f" || v "$f" 0 'missing <meta name="viewport">'
  grep -qi '<html[^>]*lang=' "$f" || v "$f" 0 'missing lang= on <html>'
  if [ "$is_err" -eq 0 ]; then
    for m in 'property="og:image"' 'property="og:image:width"' 'property="og:image:height"' 'name="twitter:card"' 'name="twitter:image"'; do
      grep -qi "<meta[^>]*$m" "$f" || v "$f" 0 "missing $m meta"
    done
  fi
done
CSS_OUT=""; CSS_RC=0; WARN_OUT=""
if [ -d "$DIST/css" ]; then
  CSS_TMP_OUT=$("$HERE/check-css.sh" "$DIST/css" 2>&1) || CSS_RC=1
  CSS_OUT=$(printf '%s\n' "$CSS_TMP_OUT" | grep -v '^ok$' || true)
  WARN_OUT=$("$HERE/check-warn.sh" "$DIST/css" 2>&1 || true)
fi
if [ -s "$VF" ] || [ "$CSS_RC" -ne 0 ]; then
  [ -s "$VF" ] && sort -u "$VF"; [ -n "$CSS_OUT" ] && printf '%s\n' "$CSS_OUT"; [ -n "$WARN_OUT" ] && printf '%s\n' "$WARN_OUT"; exit 1
fi
[ -n "$WARN_OUT" ] && printf '%s\n' "$WARN_OUT"
echo ok
exit 0
