#!/bin/sh
# Validate context and scope all targets within workspace without unquoted expansion
# Also exposes settle-gate contracts: WAIT_SINCE (dispatch epoch, 0 = none) and
# WAIT_GRACE_MS (default 30000) make wait.sh require an observed working state.
build_and_run_context() {
  ws_val=$1; self_val=$2; ws_set=$3; self_set=$4; shift 4
  count=$#; k=0
  while [ "$k" -lt "$count" ]; do
    t=$1; shift
    set -- "$@" --target "$t"
    k=$((k + 1))
  done
  if [ "$ws_set" -eq 1 ] || [ "$self_set" -eq 1 ]; then
    [ "$ws_set" -eq 1 ] && set -- --workspace "$ws_val" "$@"
    [ "$self_set" -eq 1 ] && set -- --self-pane "$self_val" "$@"
  fi
  "$HERE/context.sh" "$@"
}

# WAIT_SINCE: dispatch epoch (epoch seconds). 0 when not provided.
# WAIT_GRACE_MS: milliseconds a target may stay non-working from WAIT_SINCE
# before wait.sh declares it "never-started" instead of settling. Default 30000.
: "${WAIT_SINCE:=0}"
: "${WAIT_GRACE_MS:=30000}"

# agent_status <target> -> stdout: live status (idle/working/done; unknown on error)
# Real path: `herdr agent get` reads the current status without wait semantics.
agent_status() {
  st=$(herdr agent get "$1" 2>/dev/null </dev/null \
       | jq -r '.result.agent.agent_status // empty' 2>/dev/null || true)
  [ -n "$st" ] || st=unknown
  echo "$st"
}

# settle_wait <target> <timeout-ms> -> 0 when the target reaches idle/done/blocked.
# Real path: `herdr agent wait` without --until blocks on those states (default).
settle_wait() {
  herdr agent wait "$1" --timeout "$2" >/dev/null 2>&1
}

# working_wait <target> <timeout-ms> -> 0 when working is observed in the window
# Real path: `herdr agent wait --until working` times out (rc 1) when it never
# happens, so a nonzero result means "not observed", not an error state.
working_wait() {
  herdr agent wait "$1" --until working --timeout "$2" >/dev/null 2>&1
}
