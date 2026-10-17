#!/bin/sh
# Usage: dispatch.sh [--workspace ID --self-pane ID] [--notify PANE] [--wait-idle SEC] [--then TARGET BRIEF] [--dry-run] [--force-existing-report] <target> <brief-path>
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
die() { rc=$1; shift; echo "dispatch.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 [--workspace ID --self-pane ID] [--notify PANE] [--wait-idle SEC] [--then TARGET BRIEF] [--dry-run] [--force-existing-report] <target> <brief-path>"; }
# Helpers (report extraction, guard, contract logs) live in dispatch-lib.sh.
. "$HERE/dispatch-lib.sh"
WS=; SELF=; WS_SET=0; SELF_SET=0; NOTIFY=; NOTIFY_SET=0
THEN_TARGET=; THEN_BRIEF=; THEN_SET=0; WAIT_IDLE=0; DRY_RUN=0; FORCE_EXISTING_REPORT=0
TARGET=; BRIEF=; POS_COUNT=0
while [ $# -gt 0 ]; do
  case "$1" in
    --workspace) [ $# -ge 2 ] || usage; WS=$2; WS_SET=1; shift 2;;
    --self-pane) [ $# -ge 2 ] || usage; SELF=$2; SELF_SET=1; shift 2;;
    --notify) [ $# -ge 2 ] || usage; NOTIFY=$2; NOTIFY_SET=1; shift 2;;
    --wait-idle) [ $# -ge 2 ] || usage; WAIT_IDLE=$2; shift 2;;
    --then) [ $# -ge 3 ] || usage; THEN_TARGET=$2; THEN_BRIEF=$3; THEN_SET=1; shift 3;;
    --dry-run) DRY_RUN=1; shift;;
    --force-existing-report) FORCE_EXISTING_REPORT=1; shift;;
    --)
      shift
      while [ $# -gt 0 ]; do
        case "$POS_COUNT" in 0) TARGET=$1; POS_COUNT=1;; 1) BRIEF=$1; POS_COUNT=2;; *) usage;; esac
        shift
      done; break;;
    --*) usage;;
    *) case "$POS_COUNT" in 0) TARGET=$1; POS_COUNT=1;; 1) BRIEF=$1; POS_COUNT=2;; *) usage;; esac; shift;;
  esac
done
[ "$POS_COUNT" -eq 2 ] || usage
case "$WAIT_IDLE" in ''|*[!0-9]*) usage;; esac
case "$BRIEF" in /*) ;; *) BRIEF="$ROOT/$BRIEF";; esac
[ -f "$BRIEF" ] || die 1 "brief missing: $BRIEF"
if [ "$THEN_SET" -eq 1 ]; then
  case "$THEN_BRIEF" in /*) ;; *) THEN_BRIEF="$ROOT/$THEN_BRIEF";; esac
  [ -f "$THEN_BRIEF" ] || die 1 "then-brief missing: $THEN_BRIEF"
fi
REPORT_RE='tmp/[[:alnum:]_.-]+/(report|review)-[[:alnum:]_.-]+\.md'
REPORT_PATHS=$(report_paths "$BRIEF")
THEN_REPORT_PATHS=
if [ "$THEN_SET" -eq 1 ]; then THEN_REPORT_PATHS=$(report_paths "$THEN_BRIEF"); fi
guard_reports $REPORT_PATHS $THEN_REPORT_PATHS
# Contract: task = brief parent dir name, unit = brief filename minus brief- prefix and .md.
BDIR=$(dirname "$BRIEF"); TASK=$(basename "$BDIR"); UNIT=$(basename "$BRIEF" .md); UNIT=${UNIT#brief-}
REPORT_PATH=$(printf '%s\n' "$REPORT_PATHS" | head -n 1)
if [ -n "$REPORT_PATH" ]; then REPORT_ARG=$REPORT_PATH; else REPORT_ARG='<report-path>'; fi
set -- "${DISPATCH_CTX_CMD:-$HERE/context.sh}"
if [ "$WS_SET" -eq 1 ] || [ "$SELF_SET" -eq 1 ]; then
  [ "$WS_SET" -eq 1 ] && set -- "$@" --workspace "$WS"
  [ "$SELF_SET" -eq 1 ] && set -- "$@" --self-pane "$SELF"
fi
set -- "$@" --target "$TARGET"
[ "$THEN_SET" -eq 0 ] || set -- "$@" --target "$THEN_TARGET"
deadline=$(( $(date +%s) + WAIT_IDLE ))
while :; do
  ctx=$("$@") || exit $?
  st=$(printf '%s\n' "$ctx" | jq -r '.targets[0].agent_status // empty')
  case "$st" in idle|done) break;; *) [ $(( $(date +%s) )) -lt "$deadline" ] || die 1 "target not idle/done: $TARGET ($st)";; esac
  sleep "${DISPATCH_WAIT_INTERVAL:-5}"
done
if [ "$NOTIFY_SET" -eq 0 ]; then
  NOTIFY=$(printf '%s\n' "$ctx" | jq -r '.self_pane // empty')
  [ -n "$NOTIFY" ] || die 2 "cannot determine notify pane (pass --notify <pane>)"
fi
CALLBACK="env -u HERDR_WORKSPACE_ID -u HERDR_TAB_ID -u HERDR_PANE_ID .agents/skills/orchestrate/scripts/notify.sh --self-pane $TARGET $NOTIFY $REPORT_ARG"
FOOTER="Write 'status: in-progress' as the first line of $REPORT_ARG immediately (update it to done|blocked|failed when finished). Record at most 3 checkpoints (files done, verification done, before reporting) via .agents/skills/orchestrate/scripts/checkpoint.sh $TASK $UNIT \"<summary>\" \"<next>\"."
if [ "$THEN_SET" -eq 1 ]; then
  msg="Read $BRIEF, follow AGENTS.md, write report to $REPORT_ARG. $FOOTER On completion: if done, dispatch review via '.agents/skills/orchestrate/scripts/dispatch.sh --notify $NOTIFY $THEN_TARGET $THEN_BRIEF' (if reviewer busy: '$CALLBACK \"reviewer busy\"'); if blocked/failed: run '$CALLBACK' (records to tmp/<task>/callbacks.log)."
else
  msg="Read $BRIEF, follow AGENTS.md, write report to $REPORT_ARG. $FOOTER When done, blocked, or failed: run $CALLBACK (records to tmp/<task>/callbacks.log)."
fi
if [ "$DRY_RUN" -eq 1 ]; then
  printf '[dry-run] target=%s\n%s\n' "$TARGET" "$msg"
else
  herdr agent prompt "$TARGET" "$msg" >/dev/null || die 1 "prompt failed: $TARGET"
  TS=$(date -u +%Y-%m-%dT%H:%M:%SZ); EPOCH=$(date +%s)
  append_dispatch_logs "$TS" "$TARGET" "$UNIT" "$BDIR"
  echo "dispatched $TARGET at $TS ($EPOCH)"
fi
