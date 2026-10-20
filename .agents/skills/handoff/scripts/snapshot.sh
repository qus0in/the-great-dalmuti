#!/bin/sh
# Usage: snapshot.sh <task> [--repo PATH]... [--dry-run] [--workspace ID --self-pane ID]
# Write or update live snapshot in tmp/<task>/handoff.md from Herdr evidence.
# stdout: terse path or dry-run block. stderr: error. Exit 0 ok, 2 usage/missing, 1 invalid/herdr error.
set -u

die() { rc=$1; shift; echo "snapshot.sh: $*" >&2; exit "$rc"; }
usage() { echo "usage: $0 <task> [--repo PATH]... [--dry-run] [--workspace ID --self-pane ID]" >&2; exit 2; }

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)
. "$HERE/snapshot-render.sh"
. "$HERE/snapshot-write.sh"
TASK=""
DRY_RUN=0
WS=""
SELF=""
REPOS_FILE=$(mktemp) || die 1 "mktemp failed"
trap 'rm -f "$REPOS_FILE"' EXIT INT TERM

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift;;
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
SELF_AGENT=$(printf '%s\n' "$PJ" | jq -r '.result.pane.agent // empty')
SELF_SESSION=$(printf '%s\n' "$PJ" | jq -r '.result.pane.agent_session.value // empty')
UTC_TS=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

WORKERS=$("$ROOT/.agents/skills/orchestrate/scripts/workers.sh" --no-label --model --workspace "$WS" --self-pane "$SELF") || die 1 "workers.sh failed"

BLOCK_FILE=$(mktemp) || die 1 "mktemp failed"
trap 'rm -f "$REPOS_FILE" "$BLOCK_FILE"' EXIT INT TERM

snapshot_render

if [ "$DRY_RUN" -eq 1 ]; then
  cat "$BLOCK_FILE"
  exit 0
fi

snapshot_write
