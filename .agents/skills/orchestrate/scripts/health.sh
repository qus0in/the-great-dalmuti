#!/bin/sh
# Usage: health.sh <task> [--context-high N]
# Triage-time verdict table for dispatched-but-unfinished units (contract line 8).
# Report paths: brief rule (dispatch-lib report_paths) first, then report-/review- convention.
# Sources: dispatch.log + report first lines + one `herdr agent list` + one `pane read` per row.
# Verdict precedence: lost > provider-error > stalled > swapped > context-high > ok; exit 0 always.
# Stalled threshold via HEALTH_STALLED_MIN (default 10); provider check uses last 8 lines only.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(git rev-parse --show-toplevel 2>/dev/null || (cd "$HERE/../../../.." && pwd))
die() { rc=$1; shift; echo "health.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 <task> [--context-high N]"; }
ORCH_DIR="$ROOT/.agents/skills/orchestrate/scripts"
. "$ORCH_DIR/model-footer.sh"
. "$ORCH_DIR/dispatch-lib.sh"
[ -f "$HERE/health-callbacks.sh" ] && . "$HERE/health-callbacks.sh" || . "$ORCH_DIR/health-callbacks.sh"; [ -f "$HERE/health-probe.sh" ] && . "$HERE/health-probe.sh" || . "$ORCH_DIR/health-probe.sh"
REPORT_RE='tmp/[[:alnum:]_.-]+/(report|review)-[[:alnum:]_.-]+\.md'
TASK=; TH=${HEALTH_CONTEXT_HIGH:-80}; SM=${HEALTH_STALLED_MIN:-10}
while [ $# -gt 0 ]; do
  case "$1" in
    --context-high) [ $# -ge 2 ] || usage; TH=$2; shift 2;;
    -*) usage;;
    *) [ -z "$TASK" ] || usage; TASK=$1; shift;;
  esac
done
[ -n "$TASK" ] || usage; case "$TH" in ''|*[!0-9]*) usage;; esac; case "$SM" in ''|*[!0-9]*) usage;; esac
case "$TASK" in /*) TASK_DIR="$TASK";; tmp/*) TASK_DIR="$ROOT/$TASK";; *) [ -d "$ROOT/tmp/$TASK" ] && TASK_DIR="$ROOT/tmp/$TASK" || TASK_DIR="$TASK";; esac
LOG="$TASK_DIR/dispatch.log"; [ -f "$LOG" ] || { echo "health.sh: no dispatch events in $LOG"; exit 0; }
command -v herdr >/dev/null 2>&1 || die 1 "herdr not found in PATH"
command -v jq >/dev/null 2>&1 || die 1 "jq not found in PATH"
AJ=$(herdr agent list 2>/dev/null) || die 1 "'herdr agent list' failed"
EMIT_COUNT=0
emit_line() {
  if [ "$EMIT_COUNT" -lt 19 ]; then
    printf '%s\n' "$1"
    EMIT_COUNT=$((EMIT_COUNT + 1))
  elif [ "$EMIT_COUNT" -eq 19 ]; then
    printf '%s\n' "... (row cap 20 reached, contract)"
    EMIT_COUNT=$((EMIT_COUNT + 1))
  fi
}
emit_line "$(printf '%-16.16s %-11.11s %-12.12s %-32.32s %-16.16s %s' unit target panel "model (assigned->current)" finding verdict)"
ROW=0; FINISHED=0
while IFS= read -r dl; do
  case "$dl" in *" dispatched "*" model="*) ;; *) continue;; esac
  ts=$(printf '%s\n' "$dl" | cut -d ' ' -f1); ev=$(printf '%s\n' "$dl" | cut -d ' ' -f2); [ "$ev" = "dispatched" ] || continue
  tgt=$(printf '%s\n' "$dl" | cut -d ' ' -f3); unit=$(printf '%s\n' "$dl" | cut -d ' ' -f4)
  [ -n "$tgt" ] && [ -n "$unit" ] || continue
  model=${dl##* model=}; finished=0; repfile=""; brieff="$TASK_DIR/brief-$unit.md"; rp=""
  [ -f "$brieff" ] && rp=$(report_paths "$brieff" | head -n 1)
  case "$rp" in /*) ;; tmp/*) rp="$ROOT/$rp";; '') rp=;; *) rp="$TASK_DIR/$rp";; esac
  for cand in "$rp" "$TASK_DIR/report-$unit.md" "$TASK_DIR/review-$unit.md" "$TASK_DIR/${rp##*/}"; do
    [ -n "$cand" ] && [ -f "$cand" ] || continue
    repfile=$cand; case "$(head -n 1 "$cand" 2>/dev/null)" in "status: done"|"status: blocked"|"status: failed") finished=1;; esac
    break
  done
  [ "$finished" -eq 0 ] || { FINISHED=$((FINISHED+1)); continue; }
  ROW=$((ROW+1))
  panel=$(printf '%s\n' "$AJ" | jq -r --arg t "$tgt" \
    '[.result.agents[]? | select(.name == $t or .pane_id == $t)][0] | if . == null then "absent" else ([.pane_id, .agent, (.agent_status // "-")] | @tsv) end')
  pid=$(printf '%s\n' "$panel" | cut -f1)
  if [ -z "$pid" ] || [ "$pid" = "absent" ]; then
    emit_line "$(printf '%-16.16s %-11.11s %-12.12s %-32.32s %-16.16s %s' "$unit" "$tgt" "absent" "$model -> ?" "panel gone (since $ts)" lost)"
    continue
  fi
  agent=$(printf '%s\n' "$panel" | cut -f2); pstatus=$(printf '%s\n' "$panel" | cut -f3)
  raw=$(herdr pane read "$pid" --source visible 2>/dev/null | tail -n 25 || true)
  parsed=$(workers_parse_footer "$agent" "$raw" 2>/dev/null)
  cur=$(printf '%s\n' "$parsed" | cut -f1); eff=$(printf '%s\n' "$parsed" | cut -f2)
  case "$cur" in ''|'?') cm='?'; am='?';; *) cm="$cur $eff"; am=$model;; esac
  case "$am" in ''|'?') am='?';; *' '*) am=${am% *};; esac
  verdict=ok; finding='-'
  if pm=$(health_provider_match "$raw"); [ -n "$pm" ]; then
    verdict=provider-error; finding=$pm
  elif sf=$(health_stalled_finding "$TASK_DIR" "$unit" "$pstatus" "$ts" "$repfile" "$SM"); [ -n "$sf" ]; then
    verdict=stalled; finding=$sf
  elif [ "$am" != '?' ] && [ "$(printf '%s' "$am" | tr 'A-Z' 'a-z')" != "$(printf '%s' "$cur" | tr 'A-Z' 'a-z')" ]; then
    verdict=swapped; finding="model mismatch (since $ts)"
  elif ctxp=$(printf '%s\n' "$raw" | grep -Eio 'context.{0,6}[0-9]{1,3}%' | head -n 1 | grep -Eo '[0-9]{1,3}%'); [ -n "$ctxp" ]; then
    ctxn=${ctxp%?}; finding="context ${ctxp}"; [ "$ctxn" -ge "$TH" ] && verdict=context-high
  elif printf '%s\n' "$raw" | grep -Eqi 'context'; then
    verdict=provider-error; finding='context phrase (no %)'
  fi
  emit_line "$(printf '%-16.16s %-11.11s %-12.12s %-32.32s %-16.16s %s' "$unit" "$tgt" "${pstatus:--}" "$model -> $cm" "$finding" "$verdict")"
done < "$LOG"
[ "$ROW" -ge 1 ] || emit_line "(no unfinished units; $FINISHED already done)"
u_lines=$(health_unreceived_lines "$TASK_DIR")
if [ -n "$u_lines" ]; then
  emit_line ""
  emit_line "[미수신 콜백]"
  emit_line "$(printf '%-16.16s %-11.11s %-11.11s %-8.8s %s' unit worker delivered status report)"
  while IFS= read -r uline; do
    [ -n "$uline" ] || continue
    emit_line "$uline"
  done <<EOF
$u_lines
EOF
fi
exit 0
