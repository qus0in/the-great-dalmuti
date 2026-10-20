#!/bin/sh
# agy-only model restore after context reset; sourced by dispatch-reset.sh.
# Per user rule (2026-10-20): user-set models survive clear/reset; when a reset
# changed them, restore the pre-reset value, else keep the abort-on-change path.
. "$HERE/set-effort-agy.sh"
# $1 = pre-reset footer "<model>\t<effort>". Abort before the brief on failure;
# on success set RESTORE_AFTER to the post-restore screen so the existing reset
# error checks run against the restored state instead of the reset echo.
reset_restore_model() {
  restore_want=$1
  restore_want_model=$(printf '%s\n' "$restore_want" | cut -f1)
  restore_want_eff=$(printf '%s\n' "$restore_want" | cut -f2)
  restore_base=$(model_id_for "$restore_want_model")
  [ -n "$restore_base" ] || die 1 "model restore failed: $TARGET unknown model id: $restore_want_model"
  restore_alt=$(model_id_alt "$restore_base"); restore_prev=""
  for restore_cand in "$restore_base-$restore_want_eff" "$restore_alt-$restore_want_eff"; do
    [ "$restore_cand" != "$restore_prev" ] || continue; restore_prev=$restore_cand
    herdr pane send-text "$TARGET" "/model $restore_cand" || die 1 "model restore failed: $TARGET sending /model $restore_cand"
    herdr pane send-keys "$TARGET" enter || die 1 "model restore failed: $TARGET sending enter"
    RESTORE_AFTER=$(herdr pane read "$TARGET" --source visible 2>/dev/null) || RESTORE_AFTER=""
    if is_invalid_model "$RESTORE_AFTER"; then
      herdr pane send-keys "$TARGET" esc >/dev/null 2>&1 || true
      continue
    fi
    restore_footer=$(reset_model "$RESTORE_AFTER")
    [ "$restore_footer" = "$restore_want" ] && return 0
    herdr pane send-keys "$TARGET" esc >/dev/null 2>&1 || true
    break
  done
  die 1 "model restore failed: $TARGET want=$restore_want got=${restore_footer:-?}"
}
