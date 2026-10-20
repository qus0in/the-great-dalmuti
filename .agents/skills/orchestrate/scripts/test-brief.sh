#!/bin/sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
FIX="$ROOT/tmp/brief-test-$$"; mkdir -p "$FIX"; trap 'rm -rf "$FIX"' EXIT
B="$HERE/brief.sh"
TASK="brief-test-$$"
REVIEW_ARGS="unit=debt author=pF author_brief=brief-pF-debt.md report=report-pF-debt.md snapshot=snapshot-debt.tar.gz criteria=A-F"

# 1. review brief: name, substituted keys, common tail
"$B" review "$TASK" pD $REVIEW_ARGS > /dev/null
F="$ROOT/tmp/$TASK/brief-pD-review-debt.md"
[ -f "$F" ] || { echo "review brief not created" >&2; exit 1; }
for pat in "brief-pF-debt.md" "report-pF-debt.md" "snapshot-debt.tar.gz" "cmp" "A-F" "review-pD-debt.md" "첫머리 요약 블록"; do
  grep -Fq "$pat" "$F" || { echo "review brief misses: $pat" >&2; exit 1; }
done
if grep -q '{{' "$F"; then echo "unresolved placeholder in review brief" >&2; exit 1; fi
for pat in "status: done" "verdict: accept|block" "완료 꼬리" "재사용"; do
  grep -Fq "$pat" "$F" || { echo "review brief misses contract: $pat" >&2; exit 1; }
done

# 2. existing brief -> refuse (exit 1)
rc=0; "$B" review "$TASK" pD $REVIEW_ARGS > /dev/null 2>&1 || rc=$?
[ "$rc" -eq 1 ] || { echo "expected exit 1 on existing brief, got $rc" >&2; exit 1; }

# 3. missing key -> exit 2 with the key name
rc=0; err=$("$B" review "$TASK" pD unit=debt 2>&1 > /dev/null) || rc=$?
[ "$rc" -eq 2 ] || { echo "expected exit 2 on missing key, got $rc" >&2; exit 1; }
printf '%s' "$err" | grep -Fq "author" || { echo "missing-key error must name the key" >&2; exit 1; }

# 4. unknown key -> exit 2
rc=0; "$B" review "$TASK" pD $REVIEW_ARGS bogus=1 > /dev/null 2>&1 || rc=$?
[ "$rc" -eq 2 ] || { echo "expected exit 2 on unknown key, got $rc" >&2; exit 1; }

# 5. deploy brief
"$B" deploy "$TASK" pD pr=72 merge=8a8c95c version=0.3.14 paths=/js/play-lobby.js,/play=play.html > /dev/null
F2="$ROOT/tmp/$TASK/brief-pD-deploy.md"
[ -f "$F2" ] || { echo "deploy brief not created" >&2; exit 1; }
for pat in '`/js/play-lobby.js`' '/play=play.html' '`/healthz`' "15분" "sha256" "report-pD-deploy.md"; do
  grep -Fq "$pat" "$F2" || { echo "deploy brief misses: $pat" >&2; exit 1; }
done

# 6. pr-body brief
"$B" pr-body "$TASK" pA version=0.3.14 closes=71,72 sources=report-pF-debt.md,report-pA-reldocs.md since=origin/main > /dev/null
F3="$ROOT/tmp/$TASK/brief-pA-pr-body.md"
[ -f "$F3" ] || { echo "pr-body brief not created" >&2; exit 1; }
for pat in "Closes #71, closes #72" '`report-pF-debt.md`' "origin/main...dev" "pr-body.md" "report-pA-pr-body.md"; do
  grep -Fq "$pat" "$F3" || { echo "pr-body brief misses: $pat" >&2; exit 1; }
done

# 7. unknown kind -> exit 2
rc=0; "$B" nosuch "$TASK" pD > /dev/null 2>&1 || rc=$?
[ "$rc" -eq 2 ] || { echo "expected exit 2 on unknown kind, got $rc" >&2; exit 1; }

echo "brief tests: ok"
