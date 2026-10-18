#!/bin/sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(git rev-parse --show-toplevel 2>/dev/null || (cd "$HERE/../../../.." && pwd))
TASK="test-verify-$$"
TD="$ROOT/tmp/$TASK"
mkdir -p "$TD/bin"
trap 'rm -rf "$TD"' EXIT
VERIFY="$HERE/verify.sh"

# 1. usage / argument checks
rc=0; "$VERIFY" >/dev/null 2>&1 || rc=$?
[ "$rc" -eq 2 ] || { echo "expected exit 2 on no args, got $rc" >&2; exit 1; }

rc=0; "$VERIFY" "$TASK" invalid_gate >/dev/null 2>&1 || rc=$?
[ "$rc" -eq 2 ] || { echo "expected exit 2 on invalid gate, got $rc" >&2; exit 1; }

rc=0; "$VERIFY" "missing-task-$$" all >/dev/null 2>&1 || rc=$?
[ "$rc" -eq 2 ] || { echo "expected exit 2 on missing task dir, got $rc" >&2; exit 1; }

# 2. Stub npm that passes
cat << 'EOF' > "$TD/bin/npm"
#!/bin/sh
echo "mock npm: $@"
exit 0
EOF
chmod +x "$TD/bin/npm"

# Individual gates with stub npm
out=$(PATH="$TD/bin:$PATH" "$VERIFY" "$TASK" format)
printf '%s\n' "$out" | grep -Fq "verify: format pass (exit 0; log tmp/$TASK/verify-format.log)" || exit 1
[ -f "$TD/verify-format.log" ] || exit 1
grep -Fq "mock npm: run format:check" "$TD/verify-format.log" || exit 1

out=$(PATH="$TD/bin:$PATH" "$VERIFY" "$TASK" lint)
printf '%s\n' "$out" | grep -Fq "verify: lint pass (exit 0; log tmp/$TASK/verify-lint.log)" || exit 1
[ -f "$TD/verify-lint.log" ] || exit 1
grep -Fq "mock npm: run lint" "$TD/verify-lint.log" || exit 1

out=$(PATH="$TD/bin:$PATH" "$VERIFY" "$TASK" test)
printf '%s\n' "$out" | grep -Fq "verify: test pass (exit 0; log tmp/$TASK/verify-test.log)" || exit 1
[ -f "$TD/verify-test.log" ] || exit 1
grep -Fq "mock npm: test" "$TD/verify-test.log" || exit 1

# 3. verify all includes format, lint, test
out=$(PATH="$TD/bin:$PATH" "$VERIFY" "$TASK" all)
printf '%s\n' "$out" | grep -Fq "verify: format pass" || exit 1
printf '%s\n' "$out" | grep -Fq "verify: lint pass" || exit 1
printf '%s\n' "$out" | grep -Fq "verify: test pass" || exit 1

# 4. Gate failure propagation
cat << 'EOF' > "$TD/bin/npm"
#!/bin/sh
if [ "$1" = "run" ] && [ "$2" = "format:check" ]; then
  echo "prettier formatting error" >&2
  exit 1
fi
exit 0
EOF
chmod +x "$TD/bin/npm"

rc=0; out=$(PATH="$TD/bin:$PATH" "$VERIFY" "$TASK" format) || rc=$?
[ "$rc" -eq 1 ] || { echo "expected exit 1 on gate failure, got $rc" >&2; exit 1; }
printf '%s\n' "$out" | grep -Fq "verify: format FAIL (exit 1; log tmp/$TASK/verify-format.log)" || exit 1
printf '%s\n' "$out" | grep -Fq "verify: FAIL" || exit 1

echo "test-verify: ok"
