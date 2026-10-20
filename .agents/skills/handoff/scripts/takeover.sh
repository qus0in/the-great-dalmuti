#!/bin/sh
# Usage: takeover.sh <task> [--session ID] [--repo PATH]... [--workspace ID --self-pane ID]
# Verify orchestrator/caller identity from live evidence and inspect drift against tmp/<task>/handoff.md.
# stdout: terse verification & drift summary. stderr: error. Exit 0 ok, 2 usage/missing, 1 invalid/mismatch.
set -u
die() { rc=$1; shift; echo "takeover.sh: $*" >&2; exit "$rc"; }
usage() { echo "usage: $0 <task> [--session ID] [--repo PATH]... [--workspace ID --self-pane ID]" >&2; exit 2; }

HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
. "$HERE/takeover-report.sh"
TASK=""; EXP_SESSION=""; WS=""; SELF=""
REPOS_FILE=$(mktemp) || die 1 "mktemp failed"
trap 'rm -f "$REPOS_FILE"' EXIT INT TERM

while [ $# -gt 0 ]; do
  case "$1" in
    --session) [ $# -ge 2 ] || usage; EXP_SESSION=$2; shift 2;;
    --workspace) [ $# -ge 2 ] || usage; WS=$2; shift 2;;
    --self-pane) [ $# -ge 2 ] || usage; SELF=$2; shift 2;;
    --repo) [ $# -ge 2 ] || usage; [ -n "$2" ] || die 2 "empty --repo path"; printf '%s\n' "$2" >> "$REPOS_FILE"; shift 2;;
    -*) usage;;
    *) [ -z "$TASK" ] || usage; TASK=$1; shift;;
  esac
done

[ -n "$TASK" ] || usage
case "$TASK" in *[!A-Za-z0-9_./-]*|*..*|*//*) die 2 "invalid task name: '$TASK'";; esac

[ "${HERDR_ENV:-}" = 1 ] || die 2 "HERDR_ENV is not 1: run inside a herdr pane"
command -v herdr >/dev/null 2>&1 || die 1 "herdr not found in PATH"
command -v jq >/dev/null 2>&1 || die 1 "jq not found in PATH"

CTX_ARGS=""
[ -z "$WS" ] || CTX_ARGS="$CTX_ARGS --workspace $WS"
[ -z "$SELF" ] || CTX_ARGS="$CTX_ARGS --self-pane $SELF"
CTX=$("$ROOT/.agents/skills/orchestrate/scripts/context.sh" $CTX_ARGS) || exit $?
WS=$(printf '%s\n' "$CTX" | jq -r '.workspace_id'); SELF=$(printf '%s\n' "$CTX" | jq -r '.self_pane')

PJ=$(herdr pane get "$SELF" 2>/dev/null </dev/null) || die 1 "failed to get pane $SELF"
PANE_AGENT=$(printf '%s\n' "$PJ" | jq -r '.result.pane.agent // empty')
PANE_SESSION=$(printf '%s\n' "$PJ" | jq -r '.result.pane.agent_session.value // empty')
[ -n "$PANE_AGENT" ] || die 1 "pane $SELF has no registered agent"

CALLER_AGENT=""; curr_pid=$$
while [ "$curr_pid" -gt 1 ] 2>/dev/null; do
  pinfo=$(ps -p "$curr_pid" -o ppid=,comm= 2>/dev/null) || break
  next_pid=$(echo "$pinfo" | awk '{print $1}')
  comm=$(echo "$pinfo" | awk '{$1=""; print $0}' | sed 's/^ *//')
  bname=$(basename "$comm" 2>/dev/null | awk '{print $1}')
  case "$bname" in "$PANE_AGENT"|agy|claude|opencode|codex) CALLER_AGENT="$bname"; break;; esac
  [ -n "$next_pid" ] && [ "$next_pid" -ne "$curr_pid" ] || break
  curr_pid=$next_pid
done

[ -n "$CALLER_AGENT" ] || die 1 "could not verify caller agent from process ancestors: unprovable identity"
[ "$CALLER_AGENT" = "$PANE_AGENT" ] || die 1 "caller agent mismatch: process ancestor is '$CALLER_AGENT', but pane $SELF agent is '$PANE_AGENT'"

if [ -n "$EXP_SESSION" ]; then
  [ "$EXP_SESSION" = "$PANE_SESSION" ] || die 1 "session mismatch: expected '$EXP_SESSION', but pane $SELF session is '${PANE_SESSION:-none}'"
fi

case "$TASK" in
  /*) HANDOFF_FILE="$TASK/handoff.md"; STATE_FILE="$TASK/state.md";;
  *) HANDOFF_FILE="$ROOT/tmp/$TASK/handoff.md"; STATE_FILE="$ROOT/tmp/$TASK/state.md";;
esac
[ -f "$HANDOFF_FILE" ] || die 2 "handoff record missing: tmp/$TASK/handoff.md"
grep -Eqi 'backend[:=][[:space:]]*herdr' "$HANDOFF_FILE" || die 1 "backend is not Herdr in tmp/$TASK/handoff.md"

LIVE_WORKERS=$("$ROOT/.agents/skills/orchestrate/scripts/workers.sh" --no-label --model --workspace "$WS" --self-pane "$SELF") || die 1 "workers.sh failed"

takeover_report

case "$TASK" in
  /*) TASK_DISP="$TASK";;
  tmp/*) TASK_DISP="$TASK";;
  *) TASK_DISP="tmp/$TASK";;
esac
if [ -f "$STATE_FILE" ]; then
  IN_PROG=$(awk '
    $2 == "dispatched" { dispatched[$4] = 1 }
    $2 == "callback" {
      if ($3 ~ /^(done|blocked|failed)$/) delete dispatched[$5]
      else { delete dispatched[$4]; delete dispatched[$5] }
    }
    END {
      res = ""
      for (u in dispatched) res = (res == "" ? u : res ", " u)
      print (res == "" ? "none" : res)
    }
  ' "$STATE_FILE")
  echo "in-progress units (dispatched without callback): $IN_PROG"
  echo "state (last 20 lines of $TASK_DISP/state.md):"
  tail -n 20 "$STATE_FILE"
else
  echo "state: none ($TASK_DISP/state.md missing)"
fi
