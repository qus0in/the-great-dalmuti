#!/bin/sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)
FIX="$ROOT/tmp/test-set-effort-$$"
mkdir -p "$FIX/bin" "$FIX/screens"
trap 'rm -rf "$FIX"' EXIT INT TERM

cat > "$FIX/bin/herdr" <<'EOF'
#!/bin/sh
case "$1 $2" in
  "agent list")
    printf '{"result":{"agents":[{"pane_id":"testpane","name":"workerA","agent":"%s","workspace_id":"testws"}]}}\n' "${MOCK_AGENT:-agy}"
    ;;
  "pane get")
    printf '{"result":{"pane":{"pane_id":"testpane","agent":"%s","workspace_id":"testws"}}}\n' "${MOCK_AGENT:-agy}"
    ;;
  "pane send-text") printf 'send-text %s %s\n' "$3" "$4" >> "$TEST_EVENTS";;
  "pane send-keys")
    p=$3; shift 3; printf 'send-keys %s %s\n' "$p" "$*" >> "$TEST_EVENTS"
    if [ "${MOCK_ENTER_FAIL:-0}" -eq 1 ] && [ "$*" = enter ]; then
      ec=$(cat "$TEST_EC" 2>/dev/null || echo 0); ec=$((ec + 1)); echo "$ec" > "$TEST_EC"
      if [ "$ec" -ge "${MOCK_ENTER_FAIL_ON:-2}" ]; then exit 1; fi
    fi
    ;;
  "pane read")
    idx=$(cat "$TEST_READ_IDX" 2>/dev/null || echo 0); idx=$((idx + 1)); echo "$idx" > "$TEST_READ_IDX"
    if [ -f "$TEST_SCREENS/screen_$idx" ]; then cat "$TEST_SCREENS/screen_$idx"
    else cat "$TEST_SCREENS/screen_default"; fi
    ;;
  *) exit 2;;
esac
EOF
chmod +x "$FIX/bin/herdr"

export PATH="$FIX/bin:$PATH" TEST_EVENTS="$FIX/events" TEST_READ_IDX="$FIX/read_idx" TEST_SCREENS="$FIX/screens" TEST_EC="$FIX/ec"

reset_test() { : > "$TEST_EVENTS"; rm -f "$TEST_READ_IDX" "$TEST_EC"; rm -rf "$TEST_SCREENS"/*; }
mock_screen() { printf '%s\n' "$2" > "$TEST_SCREENS/screen_$1"; }
mock_footer() { mock_screen "$1" "? for shortcuts                                   accept-edits · $2 · $3"; }
mock_slider() { printf 'Select Model\n  Effort ◂ %s ▸\n' "$2" > "$TEST_SCREENS/screen_$1"; }

# 1. agy success (medium -> high)
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=0
mock_footer 1 "Gemini 3.8 Flash" medium
mock_slider 2 medium
mock_slider 3 high
mock_footer 4 "Gemini 3.8 Flash" high
sh "$HERE/set-effort.sh" testpane high > "$FIX/agy_ok.out"
grep -q "send-text testpane /model" "$TEST_EVENTS"
grep -q "send-keys testpane enter" "$TEST_EVENTS"
grep -q "send-keys testpane right" "$TEST_EVENTS"

# 2. unexpected screen -> Esc sent and non-zero
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=0
mock_footer 1 "Gemini 3.8 Flash" medium
mock_screen 2 "Error: Unknown modal"
set +e; sh "$HERE/set-effort.sh" testpane high > "$FIX/agy_fail.out" 2> "$FIX/agy_fail.err"; rc=$?; set -e
[ "$rc" -ne 0 ]
grep -q "send-keys testpane esc" "$TEST_EVENTS"
grep -q "unexpected screen" "$FIX/agy_fail.err"

# 3. unsupported agent -> non-zero and unsupported message
reset_test; export MOCK_AGENT=codex MOCK_ENTER_FAIL=0
set +e; sh "$HERE/set-effort.sh" testpane high > "$FIX/codex.out" 2> "$FIX/codex.err"; rc=$?; set -e
[ "$rc" -ne 0 ]
grep -q "unsupported: codex" "$FIX/codex.err"
[ ! -s "$TEST_EVENTS" ]

# 4. dry-run -> outputs key sequence, no real commands sent
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=0
mock_footer default "Gemini 3.8 Flash" medium
sh "$HERE/set-effort.sh" --dry-run testpane high > "$FIX/dry.out"
[ ! -s "$TEST_EVENTS" ]
printf 'send-text /model\nsend-keys enter\nsend-keys right\nsend-keys enter\n' > "$FIX/dry_expected"
cmp "$FIX/dry.out" "$FIX/dry_expected"

# 5. model changed -> non-zero and before/after values to stderr
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=0
mock_footer 1 "Gemini 3.8 Flash" medium
mock_slider 2 medium
mock_slider 3 high
mock_footer 4 "Claude 3.7 Sonnet" high
set +e; sh "$HERE/set-effort.sh" testpane high > "$FIX/mod.out" 2> "$FIX/mod.err"; rc=$?; set -e
[ "$rc" -ne 0 ]
grep -q "model changed" "$FIX/mod.err"
grep -q "before=Gemini 3.8 Flash, after=Claude 3.7 Sonnet" "$FIX/mod.err"

# 6. final enter fails -> Esc sent and non-zero
reset_test; export MOCK_AGENT=agy MOCK_ENTER_FAIL=1 MOCK_ENTER_FAIL_ON=2
mock_footer 1 "Gemini 3.8 Flash" medium
mock_slider 2 medium
mock_slider 3 high
set +e; sh "$HERE/set-effort.sh" testpane high > "$FIX/ent.out" 2> "$FIX/ent.err"; rc=$?; set -e
[ "$rc" -ne 0 ]
grep -q "send-keys testpane esc" "$TEST_EVENTS"
grep -q "failed sending enter" "$FIX/ent.err"

echo "set-effort tests: ok"
