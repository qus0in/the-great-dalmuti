#!/bin/sh
# Usage: set-effort.sh [--dry-run] <pane> <level>
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
. "$HERE/model-footer.sh"
. "$HERE/set-effort-agy.sh"
die() { rc=$1; shift; echo "set-effort.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 [--dry-run] <pane> <level>"; }
DRY_RUN=0; POS_COUNT=0; TARGET=; TARGET_EFFORT=
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift;;
    --*) usage;;
    *) case "$POS_COUNT" in 0) TARGET=$1; POS_COUNT=1;; 1) TARGET_EFFORT=$1; POS_COUNT=2;; *) usage;; esac; shift;;
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
raw_before=$(herdr pane read "$pane" --source visible 2>/dev/null | tail -n 25) || raw_before=""
footer_before=$(workers_parse_footer "$agent" "$raw_before")
model_before=$(printf '%s' "$footer_before" | cut -f1); effort_before=$(printf '%s' "$footer_before" | cut -f2)
if [ "$DRY_RUN" -eq 1 ]; then
  base=$(model_id_for "$model_before") || base=""
  [ "$model_before" != "?" ] && [ -n "$base" ] || base=""
  if [ -n "$base" ]; then
    printf 'send-text /model %s-%s\nsend-keys enter\n' "$base" "$TARGET_EFFORT"; exit 0
  fi
  cur=$effort_before
  [ "$cur" = low ] || [ "$cur" = medium ] || [ "$cur" = high ] || cur=medium
  cval=$(effort_val "$cur"); tval=$(effort_val "$TARGET_EFFORT"); diff=$((tval - cval))
  printf 'send-text /model\nsend-keys enter\n'
  while [ "$diff" -gt 0 ]; do printf 'send-keys right\n'; diff=$((diff - 1)); done
  while [ "$diff" -lt 0 ]; do printf 'send-keys left\n'; diff=$((diff + 1)); done
  printf 'send-keys enter\n'; exit 0
fi
base=$(model_id_for "$model_before") || base=""
[ "$model_before" != "?" ] && [ -n "$base" ] || base=""
if [ -n "$base" ]; then
  alt=$(model_id_alt "$base"); prev=""
  for cand in "$base-$TARGET_EFFORT" "$alt-$TARGET_EFFORT"; do
    [ "$cand" != "$prev" ] || continue; prev=$cand
    herdr pane send-text "$pane" "/model $cand" || die 1 "failed sending /model $cand to $pane"
    herdr pane send-keys "$pane" enter || die 1 "failed sending enter to $pane"
    screen=$(herdr pane read "$pane" --source visible 2>/dev/null)
    if is_invalid_model "$screen"; then
      herdr pane send-keys "$pane" esc >/dev/null 2>&1 || true; continue
    fi
    footer_mid=$(workers_parse_footer "$agent" "$screen")
    model_mid=$(printf '%s' "$footer_mid" | cut -f1); effort_mid=$(printf '%s' "$footer_mid" | cut -f2)
    if [ "$effort_mid" = "$TARGET_EFFORT" ]; then
      [ "$model_mid" = "$model_before" ] || die 1 "model changed for $pane: before=$model_before, after=$model_mid"
      exit 0
    fi
    herdr pane send-keys "$pane" esc >/dev/null 2>&1 || true; break
  done
fi
agy_do_slider "$pane" "$TARGET_EFFORT"
raw_after=$(herdr pane read "$pane" --source visible 2>/dev/null | tail -n 25) || raw_after=""
footer_after=$(workers_parse_footer "$agent" "$raw_after")
model_after=$(printf '%s' "$footer_after" | cut -f1); footer_effort=$(printf '%s' "$footer_after" | cut -f2)
[ -n "$model_before" ] && [ "$model_before" != "?" ] && [ "$model_before" = "$model_after" ] || die 1 "model changed for $pane: before=$model_before, after=$model_after"
[ "$footer_effort" = "$TARGET_EFFORT" ] || die 1 "verification failed: expected $TARGET_EFFORT, got $footer_effort"
