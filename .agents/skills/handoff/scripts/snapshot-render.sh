#!/bin/sh
# Render the live handoff block using the caller's snapshot variables.
snapshot_render() {
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
}
