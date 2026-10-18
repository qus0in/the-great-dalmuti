#!/bin/sh
# Context reset helpers; sourced by dispatch.sh. Commands verified in references/models.md.
. "$HERE/model-footer.sh"
reset_model() {
  reset_visible=$(herdr pane read "$TARGET" --source visible 2>/dev/null | tail -n 25) || reset_visible=
  workers_parse_footer "$reset_agent" "$reset_visible"
}
reset_command() {
  case "$1:$2" in
    agy:0|claude:0) printf /clear;;
    opencode:0) printf /new;;
    agy:1|codex:0|codex:1|claude:1|opencode:1) printf /compact;;
    *) return 1;;
  esac
}
# Build inputs once; dry-run replaces the reset/wait executor with its printed plan.
reset_target_context() {
  reset_agent=$(printf '%s\n' "$ctx" | jq -r '.targets[0].agent // empty')
  reset_cmd=$(reset_command "$reset_agent" "$CONTINUE_UNIT") || {
    printf 'dispatch.sh: context reset skipped: unverified agent %s\n' "${reset_agent:-unknown}" >&2
    return 0
  }
  reset_timeout=${DISPATCH_RESET_TIMEOUT:-60}
  case "$reset_timeout" in ''|*[!0-9]*) die 2 'invalid DISPATCH_RESET_TIMEOUT';; esac
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '[dry-run] context target=%s command=%s\n[dry-run] wait target=%s confirmations=3 timeout=%s\n' "$TARGET" "$reset_cmd" "$TARGET" "$reset_timeout"
    return 0
  fi
  reset_model_before=$(reset_model)
  herdr agent prompt "$TARGET" "$reset_cmd" >/dev/null || die 1 "context reset prompt failed: $TARGET"
  ctx=$(wait_for_target "$reset_timeout" 1 0 3 "${DISPATCH_WAIT_INTERVAL:-5}" "$TARGET" "$@") || return $?
  reset_model_after=$(reset_model)
  case "$reset_model_before:$reset_model_after" in
    *'?'*) printf 'dispatch.sh: model comparison unavailable: %s before=%s after=%s\n' "$TARGET" "$reset_model_before" "$reset_model_after" >&2;;
    *) [ "$reset_model_before" = "$reset_model_after" ] || die 1 "model changed: $TARGET before=$reset_model_before after=$reset_model_after";;
  esac
  reset_after=$(herdr pane read "$TARGET" --source visible 2>/dev/null) || die 1 "cannot verify context reset: $TARGET"
  if printf '%s\n' "$reset_after" | grep -Eqi 'Compacting context|Compacting conversation|Compressing session|Summarizing session'; then
    die 1 "context reset still running: $TARGET"
  fi
  reset_errors=$(printf '%s\n' "$reset_after" | grep -Ei 'failed to compact|compaction failed|invalid.*(key|token)|expir.*(key|token)|(key|token).*expir|unknown command|unrecognized command|Error:|session.*expired' || true)
  if [ -n "$reset_errors" ]; then
    die 1 "context reset failed: $TARGET ($reset_errors)"
  fi
  if [ "$reset_agent" = opencode ] && printf '%s\n' "$reset_after" | grep -Eq "┃[[:space:]]*$reset_cmd[[:space:]]*$"; then
    die 1 "context reset command remains unsubmitted: $TARGET"
  fi
}
