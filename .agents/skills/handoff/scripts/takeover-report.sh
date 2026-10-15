#!/bin/sh
# Compare live workers, repository state, and pending task files with the handoff.
takeover_report() {
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
}
