#!/bin/sh
# Fixture for test-set-effort.sh (sourced; needs HERE ROOT FIX set).
mkdir -p "$FIX/bin" "$FIX/screens"
trap 'rm -rf "$FIX"' EXIT INT TERM
cat > "$FIX/bin/herdr" <<'EOF'
#!/bin/sh
case "$1 $2" in
  "agent list") printf '{"result":{"agents":[{"pane_id":"testpane","name":"workerA","agent":"%s","workspace_id":"testws"}]}}\n' "${MOCK_AGENT:-agy}";;
  "pane get") printf '{"result":{"pane":{"pane_id":"testpane","agent":"%s","workspace_id":"testws"}}}\n' "${MOCK_AGENT:-agy}";;
  "pane send-text") printf 'send-text %s %s\n' "$3" "$4" >> "$TEST_EVENTS";;
  "pane send-keys") p=$3; shift 3; printf 'send-keys %s %s\n' "$p" "$*" >> "$TEST_EVENTS"
    if [ "${MOCK_ENTER_FAIL:-0}" -eq 1 ] && [ "$*" = enter ]; then
      ec=$(cat "$TEST_EC" 2>/dev/null || echo 0); ec=$((ec + 1)); echo "$ec" > "$TEST_EC"
      if [ "$ec" -ge "${MOCK_ENTER_FAIL_ON:-2}" ]; then exit 1; fi
    fi;;
  "pane read") idx=$(cat "$TEST_READ_IDX" 2>/dev/null || echo 0); idx=$((idx + 1)); echo "$idx" > "$TEST_READ_IDX"
    if [ -f "$TEST_SCREENS/screen_$idx" ]; then cat "$TEST_SCREENS/screen_$idx"
    else cat "$TEST_SCREENS/screen_default"; fi;;
  *) exit 2;;
esac
EOF
chmod +x "$FIX/bin/herdr"
export PATH="$FIX/bin:$PATH" TEST_EVENTS="$FIX/events" TEST_READ_IDX="$FIX/read_idx" TEST_SCREENS="$FIX/screens" TEST_EC="$FIX/ec"
reset_test() { : > "$TEST_EVENTS"; rm -f "$TEST_READ_IDX" "$TEST_EC"; rm -f "$TEST_SCREENS"/screen_*; }
mock_screen() { printf '%s\n' "$2" > "$TEST_SCREENS/screen_$1"; }
mock_footer() { mock_screen "$1" "? for shortcuts                                   accept-edits · $2 · $3"; }
mock_slider() { printf 'Select Model\n  Effort ◂ %s ▸\n' "$2" > "$TEST_SCREENS/screen_$1"; }
mock_invalid() { mock_screen "$1" "Invalid model \"/model\" (available: gemini-3.8-flash-high, gemini-3.8-flash-medium)"; }
