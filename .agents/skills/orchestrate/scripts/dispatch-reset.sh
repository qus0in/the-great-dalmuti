#!/bin/sh
# Context reset helpers; sourced by dispatch.sh. Commands verified in
# references/models.md; agy model restore lives in model-restore-agy.sh.
. "$HERE/model-footer.sh"
. "$HERE/model-restore-agy.sh"
reset_model() {
  workers_parse_footer "$reset_agent" "$(printf '%s\n' "$1" | tail -n 25)"
}
reset_command() {
  case "$1:$2" in
    agy:0|claude:0) printf /clear;;
    opencode:0) printf /new;;
    agy:1|codex:0|codex:1|claude:1|opencode:1) printf /compact;;
    *) return 1;;
  esac
}
reset_incremental_lines() {
  [ -n "$1" ] || { printf '%s\n' "$2"; return 0; }
  reset_nb=$(printf '%s\n' "$1" | wc -l | tr -d ' ')
  printf '%s\n%s\n' "$1" "$2" | awk -v nb="$reset_nb" '
    NR <= nb { b[NR] = $0; next }
    { a[NR - nb] = $0 }
    END {
      na = NR - nb; match_k = 0; k = (na < nb) ? na : nb
      for (len = k; len >= 1; len--) {
        ok = 1
        for (i = 1; i <= len; i++) if (a[i] != b[nb - len + i]) { ok = 0; break }
        if (ok) { match_k = len; break }
      }
      for (i = match_k + 1; i <= na; i++) print a[i]
    }
  '
}
# Scope error check to lines after reset cmd echo, or bottom N=8 lines (rationale:
# TUI footer 1-2, input 1-2, error banner 1-4 <= 8; body stays above).
reset_inspect_lines() {
  printf '%s\n' "$1" | awk -v cmd="$2" -v n="${3:-8}" '
    { lines[NR] = $0 }
    $0 ~ ("^[[:space:]]*([>❯┃$#%]|User:|You:)?[[:space:]]*" cmd "[[:space:]]*$") { last = NR }
    END {
      start = (last > 0) ? last + 1 : ((NR - n + 1 > 1) ? NR - n + 1 : 1)
      for (i = start; i <= NR; i++) print lines[i]
    }
  '
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
  reset_before=$(herdr pane read "$TARGET" --source visible 2>/dev/null) || reset_before=
  reset_model_before=$(reset_model "$reset_before")
  herdr agent prompt "$TARGET" "$reset_cmd" >/dev/null || die 1 "context reset prompt failed: $TARGET"
  ctx=$(wait_for_target "$reset_timeout" 1 0 3 "${DISPATCH_WAIT_INTERVAL:-5}" "$TARGET" "$@") || return $?
  reset_after=$(herdr pane read "$TARGET" --source visible 2>/dev/null) || die 1 "cannot verify context reset: $TARGET"
  reset_model_after=$(reset_model "$reset_after")
  case "$reset_model_before:$reset_model_after" in
    *'?'*) printf 'dispatch.sh: model comparison unavailable: %s before=%s after=%s\n' "$TARGET" "$reset_model_before" "$reset_model_after" >&2;;
    *) [ "$reset_model_before" = "$reset_model_after" ] || {
         case "$reset_agent" in
           agy) reset_restore_model "$reset_model_before" && reset_after=$RESTORE_AFTER;;
           *) die 1 "model changed: $TARGET before=$reset_model_before after=$reset_model_after";;
         esac
       };;
  esac
  if printf '%s\n' "$reset_after" | grep -Eqi 'Compacting context|Compacting conversation|Compressing session|Summarizing session'; then
    die 1 "context reset still running: $TARGET"
  fi
  reset_new=$(reset_incremental_lines "$reset_before" "$reset_after")
  reset_inspect=$(reset_inspect_lines "$reset_new" "$reset_cmd")
  reset_err_ci='failed to compact|compaction failed|invalid.*(key|token)|expir.*(key|token)|(key|token).*expir|unknown command|unrecognized command|session.*expired'
  reset_errors=$({
    printf '%s\n' "$reset_inspect" | grep -Ei "$reset_err_ci" || true
    printf '%s\n' "$reset_inspect" | grep -E '^[[:space:]]*Error:' || true
  } | sed '/^[[:space:]]*$/d' | sort -u)
  if [ -n "$reset_errors" ]; then
    die 1 "context reset failed: $TARGET ($reset_errors)"
  fi
  if [ "$reset_agent" = opencode ] && printf '%s\n' "$reset_after" | grep -Eq "┃[[:space:]]*$reset_cmd[[:space:]]*$"; then
    die 1 "context reset command remains unsubmitted: $TARGET"
  fi
}
