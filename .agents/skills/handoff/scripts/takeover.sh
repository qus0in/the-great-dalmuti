#!/bin/sh
# Usage: takeover.sh <task> [--session ID] [--repo PATH]... [--workspace ID --self-pane ID]
# Verify orchestrator/caller identity from live evidence and inspect drift against tmp/<task>/handoff.md.
# stdout: terse verification & drift summary. stderr: error. Exit 0 ok, 2 usage/missing, 1 invalid/mismatch.
set -u

die() { rc=$1; shift; echo "takeover.sh: $*" >&2; exit "$rc"; }
usage() { echo "usage: $0 <task> [--session ID] [--repo PATH]... [--workspace ID --self-pane ID]" >&2; exit 2; }

ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
TASK=""
EXP_SESSION=""
WS=""
SELF=""
REPOS_FILE=$(mktemp) || die 1 "mktemp failed"
trap 'rm -f "$REPOS_FILE"' EXIT INT TERM

while [ $# -gt 0 ]; do
  case "$1" in
    --session) [ $# -ge 2 ] || usage; EXP_SESSION=$2; shift 2;;
    --workspace) [ $# -ge 2 ] || usage; WS=$2; shift 2;;
    --self-pane) [ $# -ge 2 ] || usage; SELF=$2; shift 2;;
    --repo)
      [ $# -ge 2 ] || usage
      [ -n "$2" ] || die 2 "empty --repo path"
      printf '%s\n' "$2" >> "$REPOS_FILE"
      shift 2
      ;;
    -*) usage;;
    *)
      if [ -z "$TASK" ]; then
        TASK=$1
        shift
      else
        usage
      fi
      ;;
  esac
done

[ -n "$TASK" ] || usage
case "$TASK" in
  *[!A-Za-z0-9_./-]*|*..*|*//*|/*|*/) die 2 "invalid task name: '$TASK'";;
esac

[ "${HERDR_ENV:-}" = 1 ] || die 2 "HERDR_ENV is not 1: run inside a herdr pane"
command -v herdr >/dev/null 2>&1 || die 1 "herdr not found in PATH"
command -v jq >/dev/null 2>&1 || die 1 "jq not found in PATH"

CTX_ARGS=""
[ -n "$WS" ] && CTX_ARGS="$CTX_ARGS --workspace $WS"
[ -n "$SELF" ] && CTX_ARGS="$CTX_ARGS --self-pane $SELF"

CTX=$("$ROOT/.agents/skills/orchestrate/scripts/context.sh" $CTX_ARGS) || exit $?

WS=$(printf '%s\n' "$CTX" | jq -r '.workspace_id')
SELF=$(printf '%s\n' "$CTX" | jq -r '.self_pane')

PJ=$(herdr pane get "$SELF" 2>/dev/null </dev/null) || die 1 "failed to get pane $SELF"
PANE_AGENT=$(printf '%s\n' "$PJ" | jq -r '.result.pane.agent // empty')
PANE_SESSION=$(printf '%s\n' "$PJ" | jq -r '.result.pane.agent_session.value // empty')
[ -n "$PANE_AGENT" ] || die 1 "pane $SELF has no registered agent"

CALLER_AGENT=""
curr_pid=$$
while [ "$curr_pid" -gt 1 ] 2>/dev/null; do
  pinfo=$(ps -p "$curr_pid" -o ppid=,comm= 2>/dev/null) || break
  next_pid=$(echo "$pinfo" | awk '{print $1}')
  comm=$(echo "$pinfo" | awk '{$1=""; print $0}' | sed 's/^ *//')
  bname=$(basename "$comm" 2>/dev/null | awk '{print $1}')
  case "$bname" in
    "$PANE_AGENT"|agy|claude|opencode|codex)
      CALLER_AGENT="$bname"
      break
      ;;
  esac
  [ -n "$next_pid" ] && [ "$next_pid" -ne "$curr_pid" ] || break
  curr_pid=$next_pid
done

[ -n "$CALLER_AGENT" ] || die 1 "could not verify caller agent from process ancestors: unprovable identity"
[ "$CALLER_AGENT" = "$PANE_AGENT" ] || die 1 "caller agent mismatch: process ancestor is '$CALLER_AGENT', but pane $SELF agent is '$PANE_AGENT'"

if [ -n "$EXP_SESSION" ]; then
  [ -n "$PANE_SESSION" ] || die 1 "session mismatch: expected '$EXP_SESSION', but pane $SELF has no session id"
  [ "$EXP_SESSION" = "$PANE_SESSION" ] || die 1 "session mismatch: expected '$EXP_SESSION', but pane $SELF session is '$PANE_SESSION'"
fi

HANDOFF_FILE="$ROOT/tmp/$TASK/handoff.md"
[ -f "$HANDOFF_FILE" ] || die 2 "handoff record missing: tmp/$TASK/handoff.md"

grep -Eqi 'backend[:=][[:space:]]*herdr' "$HANDOFF_FILE" || die 1 "backend is not Herdr in tmp/$TASK/handoff.md"

LIVE_WORKERS=$("$ROOT/.agents/skills/orchestrate/scripts/workers.sh" --model --workspace "$WS" --self-pane "$SELF") || die 1 "workers.sh failed"

BUSY=$(printf '%s\n' "$LIVE_WORKERS" | awk '$3=="working" {print $1}' | paste -sd, - | sed 's/,/, /g')

WORKER_DRIFT=""
if [ -n "$LIVE_WORKERS" ]; then
  while IFS= read -r wline; do
    [ -n "$wline" ] || continue
    wtarget=$(echo "$wline" | awk '{print $1}')
    wstatus=$(echo "$wline" | awk '{print $3}')
    rec_line=$(grep -E "^[[:space:]]*${wtarget}[[:space:]]+" "$HANDOFF_FILE" | head -n 1 || true)
    rec_status=""
    if [ -n "$rec_line" ]; then
      rec_status=$(echo "$rec_line" | awk '{print $3}')
    else
      rec_status=$(grep -oE "${wtarget}[^;]*[[:space:]](idle|working|done)" "$HANDOFF_FILE" | head -n 1 | awk '{print $NF}' || true)
    fi
    if [ -n "$rec_status" ] && [ "$rec_status" != "$wstatus" ]; then
      WORKER_DRIFT="${WORKER_DRIFT:+$WORKER_DRIFT; }${wtarget}: $wstatus (was $rec_status)"
    fi
  done << EOF
$LIVE_WORKERS
EOF
fi

LIVE_HEAD=$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
REC_HEAD=$(grep -Eo 'head=[0-9a-f]{7,40}' "$HANDOFF_FILE" | head -n 1 | cut -d= -f2 || true)
if [ -z "$REC_HEAD" ]; then
  REC_HEAD=$(grep -Eo 'dev[[:space:]]+[0-9a-f]{7,40}' "$HANDOFF_FILE" | head -n 1 | awk '{print $2}' || true)
fi

if [ -n "$REC_HEAD" ] && [ "$LIVE_HEAD" != "$REC_HEAD" ]; then
  GIT_DRIFT="HEAD changed: $LIVE_HEAD (was $REC_HEAD)"
else
  GIT_DRIFT="none (HEAD $LIVE_HEAD)"
fi

TASK_DIR="$ROOT/tmp/$TASK"
PENDING_BRIEFS=""
PENDING_REVIEWS=""

if [ -d "$TASK_DIR" ]; then
  for b in "$TASK_DIR"/brief-*.md; do
    [ -f "$b" ] || continue
    bname=$(basename "$b")
    target=${bname#brief-}
    target=${target%.md}
    case "$bname" in
      *-review*.md)
        if [ ! -f "$TASK_DIR/review-$target.md" ] && [ ! -f "$TASK_DIR/review-${target%-review*}.md" ]; then
          if ! ls "$TASK_DIR"/review-*"$target"*.md >/dev/null 2>&1; then
            PENDING_REVIEWS="${PENDING_REVIEWS:+$PENDING_REVIEWS, }$bname"
          fi
        fi
        ;;
      *)
        if [ ! -f "$TASK_DIR/report-$target.md" ]; then
          PENDING_BRIEFS="${PENDING_BRIEFS:+$PENDING_BRIEFS, }$bname"
        else
          if [ ! -f "$TASK_DIR/review-$target.md" ] && ! ls "$TASK_DIR"/review-*"$target"*.md >/dev/null 2>&1; then
            PENDING_REVIEWS="${PENDING_REVIEWS:+$PENDING_REVIEWS, }report-$target.md"
          fi
        fi
        ;;
    esac
  done
fi

echo "identity: verified (self=$SELF agent=$PANE_AGENT session=${PANE_SESSION:-none})"
echo "backend: Herdr (verified)"
echo "busy workers: ${BUSY:-none} (do not redispatch)"
echo "worker drift: ${WORKER_DRIFT:-none}"
echo "git drift (main): $GIT_DRIFT"
if [ -s "$REPOS_FILE" ]; then
  while IFS= read -r r; do
    [ -n "$r" ] || continue
    RP="$r"
    [ -d "$RP" ] || RP="$ROOT/$r"
    if [ -d "$RP" ]; then
      R_HEAD=$(git -C "$RP" rev-parse --short HEAD 2>/dev/null || echo "unknown")
      echo "git status ($r): HEAD $R_HEAD"
    fi
  done < "$REPOS_FILE"
fi
echo "pending units (brief without report): ${PENDING_BRIEFS:-none}"
echo "pending units (report without review): ${PENDING_REVIEWS:-none}"
