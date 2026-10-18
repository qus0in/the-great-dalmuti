#!/bin/sh
# Usage: set-effort.sh [--dry-run] <pane> <level>
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
. "$HERE/model-footer.sh"
die() { rc=$1; shift; echo "set-effort.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 [--dry-run] <pane> <level>"; }

DRY_RUN=0; POS_COUNT=0; TARGET=; TARGET_EFFORT=
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift;;
    --*) usage;;
    *)
      case "$POS_COUNT" in 0) TARGET=$1; POS_COUNT=1;; 1) TARGET_EFFORT=$1; POS_COUNT=2;; *) usage;; esac
      shift;;
  esac
done
[ "$POS_COUNT" -eq 2 ] || usage

json=$(herdr agent list 2>/dev/null) || json=""
agent=$(printf '%s\n' "$json" | jq -r --arg t "$TARGET" '.result.agents[]? | select(.pane_id == $t or .name == $t) | .agent' 2>/dev/null | head -n 1)
pane=$(printf '%s\n' "$json" | jq -r --arg t "$TARGET" '.result.agents[]? | select(.pane_id == $t or .name == $t) | .pane_id' 2>/dev/null | head -n 1)
if [ -z "$agent" ] || [ -z "$pane" ]; then
  pj=$(herdr pane get "$TARGET" 2>/dev/null) || pj=""
  [ -n "$agent" ] || agent=$(printf '%s\n' "$pj" | jq -r '.result.pane.agent // empty' 2>/dev/null)
  [ -n "$pane" ] || pane=$(printf '%s\n' "$pj" | jq -r '.result.pane.pane_id // empty' 2>/dev/null)
fi
[ -n "$pane" ] || pane="$TARGET"
[ -n "$agent" ] || die 1 "cannot determine agent for target: $TARGET"

case "$agent" in
  agy) ;;
  codex|opencode|claude) die 1 "unsupported: $agent (no verified effort procedure; see references/models.md)";;
  *) die 1 "unsupported agent: $agent";;
esac

case "$TARGET_EFFORT" in
  low|medium|high) ;;
  *) die 2 "invalid effort '$TARGET_EFFORT' for $agent (expected: low, medium, high)";;
esac

effort_val() { case "$1" in low) echo 1;; medium) echo 2;; high) echo 3;; *) echo 0;; esac; }
parse_slider() {
  printf '%s\n' "$1" | awk '
    match($0, /[Ee]ffort[[:space:]]*[◂<][[:space:]]*(low|medium|high)[[:space:]]*[▸>]/) {
      s = substr($0, RSTART, RLENGTH); sub(/^[Ee]ffort[[:space:]]*[◂<][[:space:]]*/, "", s)
      sub(/[[:space:]]*[▸>].*$/, "", s); print tolower(s); exit
    }'
}

raw_before=$(herdr pane read "$pane" --source visible 2>/dev/null | tail -n 25) || raw_before=""
footer_before=$(workers_parse_footer "$agent" "$raw_before")
model_before=$(printf '%s' "$footer_before" | cut -f1); effort_before=$(printf '%s' "$footer_before" | cut -f2)

if [ "$DRY_RUN" -eq 1 ]; then
  cur=$effort_before
  [ "$cur" = low ] || [ "$cur" = medium ] || [ "$cur" = high ] || cur=medium
  cval=$(effort_val "$cur"); tval=$(effort_val "$TARGET_EFFORT"); diff=$((tval - cval))
  printf 'send-text /model\nsend-keys enter\n'
  while [ "$diff" -gt 0 ]; do printf 'send-keys right\n'; diff=$((diff - 1)); done
  while [ "$diff" -lt 0 ]; do printf 'send-keys left\n'; diff=$((diff + 1)); done
  printf 'send-keys enter\n'; exit 0
fi

herdr pane send-text "$pane" "/model" || die 1 "failed sending /model to $pane"
herdr pane send-keys "$pane" enter || die 1 "failed sending enter to $pane"
screen=$(herdr pane read "$pane" --source visible 2>/dev/null)
slider=$(parse_slider "$screen")
[ -n "$slider" ] || { herdr pane send-keys "$pane" esc >/dev/null 2>&1 || true; die 1 "unexpected screen for $pane: slider not found"; }

cval=$(effort_val "$slider"); tval=$(effort_val "$TARGET_EFFORT"); diff=$((tval - cval)); steps=0
[ "$diff" -gt 0 ] && { arrow=right; steps=$diff; }; [ "$diff" -lt 0 ] && { arrow=left; steps=$((-diff)); }

while [ "$steps" -gt 0 ]; do
  herdr pane send-keys "$pane" "$arrow" || {
    herdr pane send-keys "$pane" esc >/dev/null 2>&1 || true
    die 1 "failed sending $arrow to $pane"
  }
  screen=$(herdr pane read "$pane" --source visible 2>/dev/null)
  slider=$(parse_slider "$screen")
  [ -n "$slider" ] || { herdr pane send-keys "$pane" esc >/dev/null 2>&1 || true; die 1 "unexpected screen after $arrow"; }
  steps=$((steps - 1))
done

herdr pane send-keys "$pane" enter || {
  herdr pane send-keys "$pane" esc >/dev/null 2>&1 || true
  die 1 "failed sending enter to $pane"
}
raw_after=$(herdr pane read "$pane" --source visible 2>/dev/null | tail -n 25) || raw_after=""
footer_after=$(workers_parse_footer "$agent" "$raw_after")
model_after=$(printf '%s' "$footer_after" | cut -f1); footer_effort=$(printf '%s' "$footer_after" | cut -f2)
[ -n "$model_before" ] && [ "$model_before" != "?" ] && [ "$model_before" = "$model_after" ] || die 1 "model changed for $pane: before=$model_before, after=$model_after"
[ "$footer_effort" = "$TARGET_EFFORT" ] || die 1 "verification failed: expected $TARGET_EFFORT, got $footer_effort"
