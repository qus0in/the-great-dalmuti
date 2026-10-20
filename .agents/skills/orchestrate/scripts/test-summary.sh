#!/bin/sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
FIX="$ROOT/tmp/summary-test-$$"; mkdir -p "$FIX"; trap 'rm -rf "$FIX"' EXIT
S="$HERE/summary.sh"

# 1. summary block: 4 key lines + 3 indented continuation lines, capped at 8 lines
cat > "$FIX/block.md" << 'EOF'
status: done
verdict: accept
blocking: 0
summary: A 통과
  B 통과
  C 통과
EOF
out=$("$S" "$FIX/block.md")
n=$(printf '%s\n' "$out" | wc -l | tr -d ' ')
[ "$n" -le 8 ] || { echo "block output too long: $n" >&2; exit 1; }
for pat in "status: done" "verdict: accept" "blocking: 0" "summary: A 통과" "C 통과"; do
  printf '%s\n' "$out" | grep -Fq "$pat" || { echo "block output misses: $pat" >&2; exit 1; }
done

# 2. no block -> first line + 결과 section lines + marker
cat > "$FIX/noblock.md" << 'EOF'
# 보고서

## 상황
무언가 한다.

## 결과
- 판정: `accept`
- 기준 밖 관찰은 비차단으로 남긴다.

## 참고
끝
EOF
out=$("$S" "$FIX/noblock.md")
printf '%s\n' "$out" | grep -Fq "# 보고서" || exit 1
printf '%s\n' "$out" | grep -Fq "판정" || exit 1
printf '%s\n' "$out" | grep -Fq "(no summary block)" || exit 1
n=$(printf '%s\n' "$out" | wc -l | tr -d ' ')
[ "$n" -le 8 ] || { echo "fallback output too long: $n" >&2; exit 1; }

# 3. long 결과 section is still capped
{ echo "# 긴 보고서"; echo; echo "## 결과"; i=1; while [ "$i" -le 20 ]; do echo "- 판정 항목 $i"; i=$((i + 1)); done; } > "$FIX/long.md"
out=$("$S" "$FIX/long.md")
n=$(printf '%s\n' "$out" | wc -l | tr -d ' ')
[ "$n" -le 8 ] || { echo "long output not capped: $n" >&2; exit 1; }

# 4. missing file -> exit 1
rc=0; "$S" "$FIX/nope.md" > /dev/null 2>&1 || rc=$?
[ "$rc" -eq 1 ] || { echo "expected exit 1 on missing file, got $rc" >&2; exit 1; }

# 5. usage -> exit 2
rc=0; "$S" > /dev/null 2>&1 || rc=$?
[ "$rc" -eq 2 ] || { echo "expected exit 2 on no args, got $rc" >&2; exit 1; }

echo "summary tests: ok"
