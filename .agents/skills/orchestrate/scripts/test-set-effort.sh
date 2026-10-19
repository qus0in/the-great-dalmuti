#!/bin/sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)
FIX="$ROOT/tmp/test-set-effort-$$"
. "$HERE/test-set-effort-lib.sh"
# 1. arg-form success (medium -> high, no slider moves)
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=0
mock_footer 1 "Gemini 3.8 Flash" medium
mock_footer 2 "Gemini 3.8 Flash" high
sh "$HERE/set-effort.sh" testpane high > "$FIX/agy_ok.out"
grep -q "send-text testpane /model gemini-3.8-flash-high" "$TEST_EVENTS"
[ "$(grep -c "send-keys testpane right" "$TEST_EVENTS" || true)" -eq 0 ]
# 2. Invalid model -> slider fallback success
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=0
mock_footer 1 "Gemini 3.8 Flash" medium
mock_invalid 2
mock_invalid 3
mock_slider 4 medium
mock_slider 5 high
mock_footer 6 "Gemini 3.8 Flash" high
sh "$HERE/set-effort.sh" testpane high > "$FIX/fb.out"
grep -q "send-text testpane /model gemini-3.8-flash-high" "$TEST_EVENTS"
grep -q "send-keys testpane right" "$TEST_EVENTS"
# 3. unexpected screen -> Esc and non-zero
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=0
mock_footer 1 "Gemini 3.8 Flash" medium
mock_screen 2 "Error: Unknown modal"
mock_screen 3 "Error: Unknown modal"
set +e; sh "$HERE/set-effort.sh" testpane high > "$FIX/fail.out" 2> "$FIX/fail.err"; rc=$?; set -e
[ "$rc" -ne 0 ]
grep -q "send-keys testpane esc" "$TEST_EVENTS"
grep -q "unexpected screen" "$FIX/fail.err"
# 4. unsupported agent
reset_test; export MOCK_AGENT=codex MOCK_ENTER_FAIL=0
set +e; sh "$HERE/set-effort.sh" testpane high > "$FIX/codex.out" 2> "$FIX/codex.err"; rc=$?; set -e
[ "$rc" -ne 0 ]
grep -q "unsupported: codex" "$FIX/codex.err"
[ ! -s "$TEST_EVENTS" ]
# 5. dry-run prints arg form, sends nothing
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=0
mock_footer default "Gemini 3.8 Flash" medium
sh "$HERE/set-effort.sh" --dry-run testpane high > "$FIX/dry.out"
[ ! -s "$TEST_EVENTS" ]
printf 'send-text /model gemini-3.8-flash-high\nsend-keys enter\n' > "$FIX/dry_expected"
cmp "$FIX/dry.out" "$FIX/dry_expected"
# 6. arg-form model change -> non-zero with before/after
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=0
mock_footer 1 "Gemini 3.8 Flash" medium
mock_footer 2 "Claude Sonnet 5.5" high
set +e; sh "$HERE/set-effort.sh" testpane high > "$FIX/mod.out" 2> "$FIX/mod.err"; rc=$?; set -e
[ "$rc" -ne 0 ]
grep -q "model changed" "$FIX/mod.err"
grep -q "before=Gemini 3.8 Flash, after=Claude Sonnet 5.5" "$FIX/mod.err"
# 7. dotted display retries dash variant (Claude Opus 5.5)
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=0
mock_footer 1 "Claude Opus 5.5" medium
mock_invalid 2
mock_footer 3 "Claude Opus 5.5" high
sh "$HERE/set-effort.sh" testpane high > "$FIX/alt.out"
grep -q "send-text testpane /model claude-opus-5-5-high" "$TEST_EVENTS"
# 8. slider final enter fails -> Esc and non-zero
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=1 MOCK_ENTER_FAIL_ON=4
mock_footer 1 "Gemini 3.8 Flash" medium
mock_invalid 2
mock_invalid 3
mock_slider 4 medium
mock_slider 5 high
set +e; sh "$HERE/set-effort.sh" testpane high > "$FIX/ent.out" 2> "$FIX/ent.err"; rc=$?; set -e
[ "$rc" -ne 0 ]
grep -q "send-keys testpane esc" "$TEST_EVENTS"
grep -q "failed sending enter" "$FIX/ent.err"
echo "set-effort tests: ok"
