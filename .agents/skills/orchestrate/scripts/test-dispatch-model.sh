#!/bin/sh
# Sourced by test-dispatch.sh; uses its isolated mock fixture and runner.
# Unknown agent warns once and still receives the brief.
export TEST_AGENT=mystery
set_statuses idle
run_dispatch workerA "$BRIEF" > "$FIX/unknown.out" 2> "$FIX/unknown.err"
[ "$(wc -l < "$FIX/unknown.err" | tr -d ' ')" -eq 1 ] || { cat "$FIX/unknown.err" >&2; exit 1; }
! grep -q '^prompt:/' "$FIX/events"
[ -s "$PROMPT_CAPTURE" ]; unset TEST_AGENT
# Send failure, failed cleanup result, or missing idle confirmation never sends a brief.
for failure in send result idle; do
  set_statuses idle working
  export RESET_FAIL=0 RESET_ERROR='' MODEL_AFTER='' TEST_RESET_TIMEOUT=5
  case "$failure" in send) RESET_FAIL=1;; result) MODEL_AFTER='Error: API key expired';; idle) TEST_RESET_TIMEOUT=0;; esac
  if run_dispatch workerA "$BRIEF" > "$FIX/fail.out" 2>&1; then echo "reset failure passed: $failure" >&2; exit 1; fi
  [ ! -s "$PROMPT_CAPTURE" ]
done
unset RESET_FAIL RESET_ERROR MODEL_AFTER TEST_RESET_TIMEOUT
# OpenCode uses its documented new-session command; dry-run never calls herdr prompt.
export TEST_AGENT=opencode
set_statuses idle
run_dispatch workerA "$BRIEF" > "$FIX/opencode.out"
grep -q '^prompt:/new$' "$FIX/events"
set_statuses idle
run_dispatch --continue --dry-run workerA "$BRIEF" > "$FIX/plan.out"
grep -q 'command=/compact' "$FIX/plan.out"
! grep -q '^prompt:' "$FIX/events"

# AGY uses its documented TUI commands: /clear for fresh, /compact for continued.
export TEST_AGENT=agy
set_statuses idle
run_dispatch workerA "$BRIEF" > "$FIX/agy.out"
grep -q '^prompt:/clear$' "$FIX/events"
[ -s "$PROMPT_CAPTURE" ]
set_statuses idle
run_dispatch --continue workerA "$BRIEF" > "$FIX/agy-continue.out"
grep -q '^prompt:/compact$' "$FIX/events"
[ -s "$PROMPT_CAPTURE" ]
# AGY's compaction progress label aborts before the brief is sent.
export RESET_ERROR='Compacting conversation...'
set_statuses idle
if run_dispatch workerA "$BRIEF" > "$FIX/agy-progress.out" 2>&1; then echo 'agy compaction progress passed' >&2; exit 1; fi
[ ! -s "$PROMPT_CAPTURE" ]
grep -q 'context reset still running' "$FIX/agy-progress.out"
unset RESET_ERROR TEST_AGENT

# Shared workers footer parser detects changes in either model or effort.
export TEST_AGENT=opencode MODEL_BEFORE='┃ Build auto · Model A OpenCode · max'
for after in '┃ Build auto · Model B OpenCode · max' '┃ Build auto · Model A OpenCode · medium'; do
  export MODEL_AFTER="$after"
  set_statuses idle
  if run_dispatch workerA "$BRIEF" > "$FIX/model.out" 2> "$FIX/model.err"; then echo 'model drift passed' >&2; exit 1; fi
  [ ! -s "$PROMPT_CAPTURE" ]
  grep -q 'model changed:.*before=.*Model A.*after=' "$FIX/model.err"
done
export MODEL_AFTER="$MODEL_BEFORE"
set_statuses idle
run_dispatch workerA "$BRIEF" > "$FIX/same.out" 2> "$FIX/same.err"
[ -s "$PROMPT_CAPTURE" ]; [ ! -s "$FIX/same.err" ]
for unknown in before after both; do
  export MODEL_BEFORE='┃ Build auto · Model A OpenCode · max' MODEL_AFTER='┃ Build auto · Model A OpenCode · max'
  case "$unknown" in before) MODEL_BEFORE='';; after) MODEL_AFTER='';; both) MODEL_BEFORE=''; MODEL_AFTER='';; esac
  set_statuses idle
  run_dispatch workerA "$BRIEF" > "$FIX/model-unknown.out" 2> "$FIX/model-unknown.err"
  [ -s "$PROMPT_CAPTURE" ]
  [ "$(wc -l < "$FIX/model-unknown.err" | tr -d ' ')" -eq 1 ]
  grep -q 'model comparison unavailable:' "$FIX/model-unknown.err"
done
unset TEST_AGENT MODEL_BEFORE MODEL_AFTER

# Prior conversation containing { error: null } or Error: does not cause false failure.
export TEST_AGENT=opencode
export MODEL_BEFORE=$(printf '  Promise.reject(null) catch { error: null }\n  Error: prior unrelated failure\n┃ Build auto · Model A OpenCode · max')
export MODEL_AFTER="$MODEL_BEFORE"
set_statuses idle; run_dispatch --continue workerA "$BRIEF" > "$FIX/prior-error.out" 2> "$FIX/prior-error.err"
[ -s "$PROMPT_CAPTURE" ]; [ ! -s "$FIX/prior-error.err" ]

# New error line after reset command causes failure.
export MODEL_AFTER=$(printf '%s\n  Error: new reset failure' "$MODEL_BEFORE")
set_statuses idle
if run_dispatch --continue workerA "$BRIEF" > "$FIX/new-error.out" 2>&1; then echo 'new error passed unexpectedly' >&2; exit 1; fi
[ ! -s "$PROMPT_CAPTURE" ]; grep -q 'context reset failed:.*Error: new reset failure' "$FIX/new-error.out"

# Zero-overlap redraw with Error: in prior conversation body succeeds.
export MODEL_BEFORE=$(printf 'line 1\n┃ Build auto · Model A OpenCode · max')
export MODEL_AFTER=$(printf '  Error: x\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\nline 8\nline 9\n┃ Build auto · Model A OpenCode · max')
set_statuses idle; run_dispatch --continue workerA "$BRIEF" > "$FIX/zero-overlap.out" 2> "$FIX/zero-overlap.err"
[ -s "$PROMPT_CAPTURE" ]; [ ! -s "$FIX/zero-overlap.err" ]

# Error: compaction after reset command line causes failure.
export MODEL_AFTER=$(printf '  Error: x\n> /compact\n  Error: compaction\n┃ Build auto · Model A OpenCode · max')
set_statuses idle
if run_dispatch --continue workerA "$BRIEF" > "$FIX/cmd-err.out" 2>&1; then echo 'cmd-err passed' >&2; exit 1; fi
[ ! -s "$PROMPT_CAPTURE" ]; grep -q 'context reset failed:.*Error: compaction' "$FIX/cmd-err.out"
unset TEST_AGENT MODEL_BEFORE MODEL_AFTER
