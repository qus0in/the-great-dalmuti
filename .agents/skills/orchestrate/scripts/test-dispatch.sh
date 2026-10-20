#!/bin/sh
set -eu
SCRIPT=${DISPATCH_SCRIPT:-$(dirname "$0")/dispatch.sh}
SCRIPTS=$(cd "$(dirname "$SCRIPT")" && pwd)
ROOT=${TEST_ROOT:-$(cd "$SCRIPTS/../../../.." && pwd)}
FIX="$ROOT/tmp/dispatch-test-$$"
mkdir -p "$FIX/bin"; trap 'rm -rf "$FIX"' EXIT
TASK=$(basename "$FIX")
BRIEF="$FIX/brief-case.md"
REPORT="tmp/$TASK/report-case.md"
cat > "$BRIEF" <<EOF
# dispatch test
- Owned: $REPORT
When done, blocked, or failed: notify.sh --self-pane workerA coordinator $REPORT
EOF
cat > "$FIX/context" <<'EOF'
#!/bin/sh
n=$(cat "$TEST_FIXTURE/count"); n=${n:-0}; n=$((n + 1))
printf '%s\n' "$n" > "$TEST_FIXTURE/count"
status=$(sed -n "${n}p" "$TEST_FIXTURE/statuses"); status=${status:-idle}
printf 'ctx:%s\n' "$status" >> "$TEST_FIXTURE/events"
printf '{"self_pane":"self","targets":[{"agent":"%s","agent_status":"%s"}]}\n' "${TEST_AGENT:-codex}" "$status"
EOF
cat > "$FIX/bin/herdr" <<'EOF'
#!/bin/sh
case "$1 $2" in
  "pane get") printf '{"result":{"pane":{"pane_id":"%s","workspace_id":"testws","agent":"codex"}}}\n' "$3";;
  "agent get") printf '{"result":{"agent":{"pane_id":"worker-pane","name":"workerA","agent":"codex","agent_status":"working","workspace_id":"testws"}}}\n';;
  "agent list") printf '{"result":{"agents":[{"pane_id":"worker-pane","workspace_id":"testws","agent":"codex","agent_status":"working"}]}}\n';;
  "agent prompt")
    printf 'prompt:%s\n' "$4" >> "$TEST_FIXTURE/events"
    case "$4" in /clear|/new|/compact) [ "${RESET_FAIL:-0}" = 0 ] || exit 1;; *) printf '%s\n' "$4" > "$PROMPT_CAPTURE";; esac;;
  "pane read")
    n=$(cat "$TEST_FIXTURE/model-count" 2>/dev/null || printf 0); n=$((n+1)); printf '%s\n' "$n" > "$TEST_FIXTURE/model-count"
    if [ "$n" = 1 ]; then printf '%s\n' "${MODEL_BEFORE:-}"; else printf '%s\n' "${MODEL_AFTER:-}"; fi
    printf '%s\n' "${RESET_ERROR:-}";;
  *) exit 2;;
esac
EOF
chmod +x "$FIX/context" "$FIX/bin/herdr"
export TEST_FIXTURE=$FIX HERDR_ENV=1 PATH="$FIX/bin:$PATH"
unset HERDR_WORKSPACE_ID HERDR_PANE_ID HERDR_TAB_ID
set_statuses() { printf '%s\n' "$@" > "$FIX/statuses"; printf '0\n' > "$FIX/count"; : > "$FIX/events"; rm -f "$FIX/model-count"; rm -f "${PROMPT_CAPTURE:-$FIX/none}"; }
run_dispatch() { env DISPATCH_CTX_CMD="$FIX/context" DISPATCH_WAIT_INTERVAL=0 DISPATCH_RESET_TIMEOUT="${TEST_RESET_TIMEOUT:-5}" sh "$SCRIPT" --workspace testws --self-pane self --notify coordinator "$@"; }
set_statuses working
if run_dispatch workerA "$BRIEF" --dry-run > "$FIX/busy.out" 2>&1; then echo "busy dispatch unexpectedly passed" >&2; exit 1; fi
set_statuses working
run_dispatch --replace old-unit workerA "$BRIEF" --dry-run > "$FIX/dry.out"
tail -n 1 "$FIX/dry.out" > "$FIX/dry-prompt"
set_statuses working
export PROMPT_CAPTURE=$FIX/real-prompt
run_dispatch --replace old-unit workerA "$BRIEF" > "$FIX/real.out"
cmp "$FIX/dry-prompt" "$FIX/real-prompt"
grep -Fq "이전 단위 old-unit 중단, 그 보고서는 superseded 한 줄로 마감" "$FIX/real-prompt"
grep -Fq "Write 'status: in-progress' as the first line" "$FIX/real-prompt"
grep -Fq "checkpoint.sh" "$FIX/real-prompt"
grep -Fq -e "--status blocked|failed" "$FIX/real-prompt"
grep -Fq -e "notify.sh --status blocked" "$FIX/real-prompt"
grep -Fq -e "notify.sh --status failed" "$FIX/real-prompt"
set_statuses idle working idle done done
run_dispatch --wait-idle 5 workerA "$BRIEF" --dry-run > "$FIX/wait.out"
[ "$(cat "$FIX/count")" -eq 5 ] || { echo "wait-idle did not require 3 consecutive idle/done states" >&2; exit 1; }

# New task: compact, then three consecutive confirmations before the brief.
set_statuses idle working idle done done
run_dispatch workerA "$BRIEF" > "$FIX/new.out"
[ "$(cat "$FIX/count")" -eq 5 ]
[ "$(sed -n '2p' "$FIX/events")" = 'prompt:/compact' ]
[ "$(tail -n 2 "$FIX/events" | head -n 1)" = 'ctx:done' ]
grep -q '^prompt:Read ' "$FIX/events"
# Continuing and replacement tasks compact.
set_statuses idle
run_dispatch --continue workerA "$BRIEF" > "$FIX/continue.out"
grep -q '^prompt:/compact$' "$FIX/events"
set_statuses working
run_dispatch --replace old workerA "$BRIEF" > "$FIX/replace.out"
grep -q '^prompt:/compact$' "$FIX/events"
. "$SCRIPTS/test-dispatch-model.sh"
. "$SCRIPTS/test-dispatch-reset-model.sh"
. "$SCRIPTS/test-model-footer.sh"
# Label-column regression: worker_model must return non-empty model effort (old 5-col).
export MODEL_BEFORE='  GPT-6-Luna max · ~/Workspace/the-great-dalmuti · Write review report'
export MODEL_AFTER='  GPT-6-Luna max · ~/Workspace/the-great-dalmuti · Write review report'
. "$SCRIPTS/dispatch-lib.sh"
HERE=$SCRIPTS WS=testws SELF=self WS_SET=1 SELF_SET=1
wm=$(worker_model worker-pane) || wm=
[ -n "$(printf %s "$wm" | tr -d '[:space:]')" ] || { echo "worker_model empty (label regression)" >&2; exit 1; }
case "$wm" in *"GPT-6-Luna max"*) :;; *) echo "worker_model mismatch: $wm" >&2; exit 1;; esac
grep -Fq -- '--no-label --model' "$ROOT/.agents/skills/handoff/scripts/takeover.sh" || { echo "takeover.sh lost --no-label" >&2; exit 1; }
grep -Fq -- '--no-label --model' "$ROOT/.agents/skills/handoff/scripts/snapshot.sh" || { echo "snapshot.sh lost --no-label" >&2; exit 1; }
unset MODEL_BEFORE MODEL_AFTER
echo "dispatch tests: ok (clear/compact, post-reset idle, failures, unknown, dry-run parity)"
