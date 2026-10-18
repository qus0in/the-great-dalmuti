#!/bin/sh
# Unit tests for check-img.sh review fixtures (7 violations, 2 valid).
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
CHECK_IMG="$HERE/check-img.sh"
FIX=$(mktemp -d)
trap 'rm -rf "$FIX"' EXIT INT TERM

run_case() {
  desc=$1; sub=$2; html=$3; exp_rc=$4; exp_pat=$5
  dir="$FIX/$sub"; mkdir -p "$dir"
  printf '%s\n' "$html" > "$dir/probe.html"
  rc=0; out=$("$CHECK_IMG" "$dir" 2>&1) || rc=$?
  [ "$rc" -eq "$exp_rc" ] || { echo "FAIL $desc: expected rc=$exp_rc, got $rc ($out)"; exit 1; }
  [ -z "$exp_pat" ] || printf '%s\n' "$out" | grep -Fq "$exp_pat" || {
    echo "FAIL $desc: expected '$exp_pat', got '$out'"; exit 1;
  }
}

# 7 violation fixtures from review
run_case "extra-class" "extra/src/ui/public" \
  '<img src="https://project.supabase.co/storage/v1/object/public/avatars/u/a.webp" class="avatar__img x" alt="Avatar" width="48" height="48">' \
  1 "image element not allowed"

run_case "wrong-host" "wrong-host/src/ui/public" \
  '<img src="https://evil.invalid/avatars/a.webp" class="avatar__img" alt="Avatar" width="48" height="48">' \
  1 "avatar__img src outside allow-list: https://evil.invalid/avatars/a.webp"

run_case "wrong-avatar-path" "wrong-path/src/ui/public" \
  '<img src="/uploads/avatar-silhouette.svg" class="avatar__img" alt="Avatar" width="48" height="48">' \
  1 "avatar__img src outside allow-list: /uploads/avatar-silhouette.svg"

run_case "single-quote-spoof" "sq-spoof/src/ui/public" \
  '<img src='\''/not-allowed.png'\'' class="avatar__img" alt="Avatar" width="48" height="48">' \
  1 "avatar__img src outside allow-list: /not-allowed.png"

run_case "uppercase-src" "uc-src/src/ui/public" \
  '<img SRC="/not-allowed.png" class="avatar__img" alt="Avatar" width="48" height="48">' \
  1 "avatar__img src outside allow-list: /not-allowed.png"

run_case "missing-src" "missing-src/src/ui/public" \
  '<img class="avatar__img" alt="Avatar" width="48" height="48">' \
  1 "avatar__img missing or empty src attribute"

run_case "broader-target" "broader/src/ui/private" \
  '<img src="/images/avatar-bot.svg" class="avatar__img" alt="Avatar" width="48" height="48">' \
  1 "image element not allowed"

# 4 review r1 violation fixtures
run_case "public-private" "src/ui/public-private" \
  '<img src="https://project.supabase.co/storage/v1/object/public/avatars/u/a.webp" class="avatar__img" alt="Avatar" width="48" height="48">' \
  1 "image element not allowed"

run_case "s23-probe" "s23-probe" \
  '<img src="https://project.supabase.co/storage/v1/object/public/avatars/u/a.webp" class="avatar__img" alt="Avatar" width="48" height="48">' \
  1 "image element not allowed"

run_case "dotdot" "dotdot/src/ui/public" \
  '<img src="https://project.supabase.co/storage/v1/object/public/avatars/../private/a.webp" class="avatar__img" alt="Avatar" width="48" height="48">' \
  1 "avatar__img src outside allow-list: https://project.supabase.co/storage/v1/object/public/avatars/../private/a.webp"

run_case "encoded-dotdot" "encoded-dotdot/src/ui/public" \
  '<img src="https://project.supabase.co/storage/v1/object/public/avatars/%2e%2e/private/a.webp" class="avatar__img" alt="Avatar" width="48" height="48">' \
  1 "avatar__img src outside allow-list: https://project.supabase.co/storage/v1/object/public/avatars/%2e%2e/private/a.webp"

# 2 valid fixtures (svg, supabase URL)
run_case "valid-svg" "valid-svg/src/ui/public" \
  '<img height="48" alt="Avatar" class="avatar__img" width="48" src="/images/avatar-bot.svg">' \
  0 "ok"

run_case "valid-supabase" "valid-sb/src/ui/public" \
  '<img src="https://project.supabase.co/storage/v1/object/public/avatars/u/a.webp" class="avatar__img" alt="Avatar" width="48" height="48">' \
  0 "ok"

echo "all check-img.sh review fixture tests passed"
exit 0
