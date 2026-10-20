#!/bin/sh
# Sourced by test-dispatch.sh: agy reset model restore cases on the same fixture.
# Wraps the base mock with pane send-text/send-keys recording (the base mock only
# knows agent prompt); MODEL_RESTORE=1 makes a sent /model reproduce the
# pre-reset footer, MODEL_INVALID=1 makes the first post-/model read "Invalid model".
mv "$TEST_FIXTURE/bin/herdr" "$TEST_FIXTURE/bin/herdr-base"
cat > "$TEST_FIXTURE/bin/herdr" <<'EOF'
#!/bin/sh
case "$1 $2" in
  "pane send-text") printf 'send-text:%s\n' "$4" >> "$TEST_FIXTURE/events"
    case "$4" in /model*) if [ "${MODEL_RESTORE:-0}" = 1 ]; then : > "$TEST_FIXTURE/model-restored"
      elif [ "${MODEL_INVALID:-0}" = 1 ]; then : > "$TEST_FIXTURE/model-invalid-next"; fi;; esac
    exit 0;;
  "pane send-keys") printf 'send-keys:%s\n' "$4" >> "$TEST_FIXTURE/events"; exit 0;;
  "pane read")
    if [ -f "$TEST_FIXTURE/model-restored" ] && [ -n "${MODEL_BEFORE:-}" ]; then export MODEL_AFTER="$MODEL_BEFORE"
    elif [ -f "$TEST_FIXTURE/model-invalid-next" ]; then
      rm -f "$TEST_FIXTURE/model-invalid-next"; printf '%s\n' 'Invalid model "/model" rejected'; exit 0
    fi;;
esac
exec "$TEST_FIXTURE/bin/herdr-base" "$@"
EOF
chmod +x "$TEST_FIXTURE/bin/herdr"
AGY_CASE='? for shortcuts  accept-edits · GPT 5.1 Luna · max'
export TEST_AGENT=agy
export MODEL_BEFORE="$AGY_CASE" MODEL_AFTER='? for shortcuts  accept-edits · Sol Medium · medium'
rm -f "$TEST_FIXTURE/model-restored" "$TEST_FIXTURE/model-invalid-next"
# A. Reset changed the model -> dotted id restore sent once, footer re-verified, brief proceeds.
export MODEL_RESTORE=1
set_statuses idle
export PROMPT_CAPTURE=$FIX/restore-prompt
run_dispatch workerA "$BRIEF" > "$FIX/restore.out" 2> "$FIX/restore.err"
[ ! -s "$FIX/restore.err" ]
[ "$(grep -Fc 'send-text:/model gpt-5.1-luna-max' "$FIX/events" || true)" -eq 1 ]
[ "$(grep -Fc 'send-text:/model' "$FIX/events" || true)" -eq 1 ]
grep -q '^prompt:/clear$' "$FIX/events"
grep -q '^prompt:Read ' "$FIX/events"
[ -s "$PROMPT_CAPTURE" ]
# B. Restore rejected on both id candidates -> esc fallbacks, clear error, no brief.
unset MODEL_RESTORE; export MODEL_INVALID=1
rm -f "$TEST_FIXTURE/model-restored" "$TEST_FIXTURE/model-invalid-next"
set_statuses idle
if run_dispatch workerA "$BRIEF" > "$FIX/restore-fail.out" 2> "$FIX/restore-fail.err"; then echo 'model restore failure passed' >&2; exit 1; fi
[ "$(grep -Fc 'send-text:/model' "$FIX/events" || true)" -eq 2 ]
grep -Fq 'send-text:/model gpt-5.1-luna-max' "$FIX/events"
grep -Fq 'send-text:/model gpt-5-1-luna-max' "$FIX/events"
[ "$(grep -Fc 'send-keys:esc' "$FIX/events" || true)" -eq 2 ]
! grep -q '^prompt:Read' "$FIX/events"
grep -q 'model restore failed:' "$FIX/restore-fail.err"
grep -Fq 'got=?' "$FIX/restore-fail.err"
# C. Unchanged model -> fresh path intact: no /model at all, brief proceeds.
unset MODEL_INVALID; export MODEL_AFTER="$AGY_CASE"
set_statuses idle
run_dispatch workerA "$BRIEF" > "$FIX/restore-none.out" 2> "$FIX/restore-none.err"
[ ! -s "$FIX/restore-none.err" ]
[ "$(grep -Fc 'send-text:/model' "$FIX/events" || true)" -eq 0 ]
grep -q '^prompt:/clear$' "$FIX/events"
grep -q '^prompt:Read ' "$FIX/events"
rm -f "$TEST_FIXTURE/model-restored" "$TEST_FIXTURE/model-invalid-next"
unset TEST_AGENT MODEL_BEFORE MODEL_AFTER MODEL_RESTORE MODEL_INVALID AGY_CASE
