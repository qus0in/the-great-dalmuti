#!/bin/sh
# Usage: snapshot.sh <task> [--repo PATH]... [--dry-run] [--workspace ID --self-pane ID]
# Write or update live snapshot in tmp/<task>/handoff.md from Herdr evidence.
# stdout: terse path or dry-run block. stderr: error. Exit 0 ok, 2 usage/missing, 1 invalid/herdr error.
set -u

die() { rc=$1; shift; echo "snapshot.sh: $*" >&2; exit "$rc"; }
usage() { echo "usage: $0 <task> [--repo PATH]... [--dry-run] [--workspace ID --self-pane ID]" >&2; exit 2; }

ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
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

WORKERS=$("$ROOT/.agents/skills/orchestrate/scripts/workers.sh" --model --workspace "$WS" --self-pane "$SELF") || die 1 "workers.sh failed"

BLOCK_FILE=$(mktemp) || die 1 "mktemp failed"
trap 'rm -f "$REPOS_FILE" "$BLOCK_FILE"' EXIT INT TERM

{
  echo "<!-- handoff:begin -->"
  echo "## Live snapshot ($UTC_TS)"
  echo "- backend: Herdr"
  echo "- context: $CTX"
  echo "- self: pane=$SELF agent=${SELF_AGENT:-unknown} session=${SELF_SESSION:-none}"
  echo "- timestamp: $UTC_TS"
  echo ""
  echo "### Workers"
  if [ -n "$WORKERS" ]; then
    echo "$WORKERS"
  else
    echo "(none)"
  fi
  echo ""
  echo "### Repositories"
  M_BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  M_HEAD=$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
  M_STATUS=$(git -C "$ROOT" status --short 2>/dev/null || true)
  if [ -n "$M_STATUS" ]; then M_DIRTY="dirty"; else M_DIRTY="clean"; fi
  echo "- main: branch=$M_BRANCH head=$M_HEAD status=$M_DIRTY"

  if [ -s "$REPOS_FILE" ]; then
    while IFS= read -r r; do
      [ -n "$r" ] || continue
      RP="$r"
      [ -d "$RP" ] || RP="$ROOT/$r"
      if [ -d "$RP" ]; then
        R_BRANCH=$(git -C "$RP" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
        R_HEAD=$(git -C "$RP" rev-parse --short HEAD 2>/dev/null || echo "unknown")
        R_STATUS=$(git -C "$RP" status --short 2>/dev/null || true)
        if [ -n "$R_STATUS" ]; then R_DIRTY="dirty"; else R_DIRTY="clean"; fi
        echo "- repo: path=$r branch=$R_BRANCH head=$R_HEAD status=$R_DIRTY"
      else
        echo "- repo: path=$r (not found)"
      fi
    done < "$REPOS_FILE"
  fi

  echo ""
  echo "### Tasks (tmp/$TASK)"
  TASK_DIR="$ROOT/tmp/$TASK"
  found_briefs=0
  if [ -d "$TASK_DIR" ]; then
    for b in "$TASK_DIR"/brief-*.md; do
      [ -f "$b" ] || continue
      found_briefs=1
      bname=$(basename "$b")
      target=${bname#brief-}
      target=${target%.md}
      has_report=no
      has_review=no
      [ -f "$TASK_DIR/report-$target.md" ] && has_report=yes
      if [ -f "$TASK_DIR/review-$target.md" ] || [ -f "$TASK_DIR/review-${target%-review}.md" ]; then
        has_review=yes
      elif ls "$TASK_DIR"/review-*"$target"*.md >/dev/null 2>&1; then
        has_review=yes
      fi
      echo "- $bname: report=$has_report review=$has_review"
    done
  fi
  if [ "$found_briefs" -eq 0 ]; then
    echo "(no briefs found in tmp/$TASK)"
  fi
  echo "<!-- handoff:end -->"
} > "$BLOCK_FILE"

if [ "$DRY_RUN" -eq 1 ]; then
  cat "$BLOCK_FILE"
  exit 0
fi

TARGET_MD="$ROOT/tmp/$TASK/handoff.md"
mkdir -p "$(dirname "$TARGET_MD")"

if [ -f "$TARGET_MD" ]; then
  if grep -q '<!-- handoff:begin -->' "$TARGET_MD" && grep -q '<!-- handoff:end -->' "$TARGET_MD"; then
    TMP_OUT=$(mktemp) || die 1 "mktemp failed"
    awk -v bfile="$BLOCK_FILE" '
      /<!-- handoff:begin -->/ {
        while ((getline line < bfile) > 0) print line
        close(bfile)
        skip = 1
        next
      }
      /<!-- handoff:end -->/ {
        skip = 0
        next
      }
      !skip { print }
    ' "$TARGET_MD" > "$TMP_OUT" && mv "$TMP_OUT" "$TARGET_MD"
  else
    {
      echo ""
      cat "$BLOCK_FILE"
    } >> "$TARGET_MD"
  fi
else
  {
    echo "# $TASK handoff"
    echo ""
    cat "$BLOCK_FILE"
  } > "$TARGET_MD"
fi

echo "tmp/$TASK/handoff.md"
