#!/bin/sh
set -eu
SCRIPT=${DISPATCH_SCRIPT:-$(dirname "$0")/dispatch.sh}
SCRIPTS=$(cd "$(dirname "$SCRIPT")" && pwd)
ROOT=${TEST_ROOT:-$(cd "$SCRIPTS/../../../.." && pwd)}
FIX="$ROOT/tmp/dispatch-test-$$"
mkdir -p "$FIX/bin"
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
printf '{"self_pane":"self","targets":[{"agent_status":"%s"}]}\n' "$status"
EOF
cat > "$FIX/bin/herdr" <<'EOF'
#!/bin/sh
case "$1 $2" in
  "pane get") printf '{"result":{"pane":{"pane_id":"%s","workspace_id":"testws","agent":"codex"}}}\n' "$3";;
  "agent get") printf '{"result":{"agent":{"pane_id":"worker-pane","name":"workerA","agent":"codex","agent_status":"working","workspace_id":"testws"}}}\n';;
  "agent list") printf '{"result":{"agents":[{"pane_id":"worker-pane","workspace_id":"testws","agent":"codex","agent_status":"working"}]}}\n';;
  "agent prompt") printf '%s\n' "$4" > "$PROMPT_CAPTURE";;
  "pane read") :;;
  *) exit 2;;
esac
EOF
chmod +x "$FIX/context" "$FIX/bin/herdr"
export TEST_FIXTURE=$FIX HERDR_ENV=1 PATH="$FIX/bin:$PATH"
unset HERDR_WORKSPACE_ID HERDR_PANE_ID HERDR_TAB_ID
set_statuses() { printf '%s\n' "$@" > "$FIX/statuses"; printf '0\n' > "$FIX/count"; }
run_dispatch() { env DISPATCH_CTX_CMD="$FIX/context" DISPATCH_WAIT_INTERVAL=0 sh "$SCRIPT" --workspace testws --self-pane self --notify coordinator "$@"; }
set_statuses working
if run_dispatch workerA "$BRIEF" --dry-run > "$FIX/busy.out" 2>&1; then echo "busy dispatch unexpectedly passed" >&2; exit 1; fi
set_statuses working
run_dispatch --replace old-unit workerA "$BRIEF" --dry-run > "$FIX/dry.out"
sed '1d' "$FIX/dry.out" > "$FIX/dry-prompt"
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
echo "dispatch tests: ok"
