#!/bin/sh
# Unit tests for ui-prototype check.sh and check-img.sh avatar exception rules.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
CHECK="$HERE/check.sh"
FIX=$(mktemp -d)
trap 'rm -rf "$FIX"' EXIT INT TERM

mk_page() {
  dir=$1; file=$2; body=$3
  mkdir -p "$dir/css/base" "$dir/css/tokens" "$dir/css/components"
  echo "[hidden] { display: none !important; }" > "$dir/css/reset.css"
  cat << 'EOF' > "$dir/css/tokens.css"
:root { --font-display: 'LevelUp'; }
@font-face { font-family: 'LevelUp'; src: url('dummy.woff2'); }
EOF
  echo "body { margin: 0; }" > "$dir/css/base/typography.css"
  echo ".card { border: 0; }" > "$dir/css/components/card.css"
  cat << EOF > "$dir/$file"
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test</title>
  <link rel="stylesheet" href="css/reset.css">
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/base/typography.css">
  <link rel="stylesheet" href="css/components/card.css">
  <meta property="og:image" content="https://qus0in.github.io/the-great-dalmuti/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://qus0in.github.io/the-great-dalmuti/og.png">
</head>
<body>
  $body
</body>
</html>
EOF
}

# 1. dist/ with <img> remains a violation
D1="$FIX/dist"
mk_page "$D1" "404.html" '<img src="/images/avatar-silhouette.svg" class="avatar__img" alt="avatar" width="40" height="40">'
rc=0; out=$("$CHECK" "$D1" 2>&1) || rc=$?
[ "$rc" -eq 1 ] || { echo "test 1 failed: dist <img> did not exit 1 (rc=$rc)"; exit 1; }
printf '%s\n' "$out" | grep -Fq "image element not allowed" || { echo "test 1 missing expected error: $out"; exit 1; }

# 2. src/ui/public with avatar__img and alt passes
S2="$FIX/src/ui/public"
mk_page "$S2" "404.html" '<img src="/images/avatar-silhouette.svg" class="avatar__img" alt="avatar" width="40" height="40">'
rc=0; out=$("$CHECK" "$S2" 2>&1) || rc=$?
[ "$rc" -eq 0 ] || { echo "test 2 failed: valid avatar__img exited $rc ($out)"; exit 1; }

# 3. src/ui/public avatar__img without alt is a violation
S3="$FIX/noalt/src/ui/public"
mk_page "$S3" "404.html" '<img src="/images/avatar-silhouette.svg" class="avatar__img" width="40" height="40">'
rc=0; out=$("$CHECK" "$S3" 2>&1) || rc=$?
[ "$rc" -eq 1 ] || { echo "test 3 failed: missing alt did not exit 1 (rc=$rc)"; exit 1; }
printf '%s\n' "$out" | grep -Fq "avatar__img missing alt attribute" || { echo "test 3 missing expected error: $out"; exit 1; }

# 4. src/ui/public with other class <img> is a violation
S4="$FIX/other/src/ui/public"
mk_page "$S4" "404.html" '<img src="foo.png" class="other-class" alt="other" width="40" height="40">'
rc=0; out=$("$CHECK" "$S4" 2>&1) || rc=$?
[ "$rc" -eq 1 ] || { echo "test 4 failed: other class did not exit 1 (rc=$rc)"; exit 1; }
printf '%s\n' "$out" | grep -Fq "image element not allowed" || { echo "test 4 missing expected error: $out"; exit 1; }

"$HERE/check-img.test.sh"

echo "all check.sh avatar rule tests passed"
exit 0
