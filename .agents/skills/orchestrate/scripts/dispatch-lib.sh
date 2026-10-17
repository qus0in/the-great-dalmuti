#!/bin/sh
# Helpers for dispatch.sh, split out to keep both files under the 100-line rule.
# Sourced (not run) by dispatch.sh; uses its globals (REPORT_RE, FORCE_EXISTING_REPORT, HERE, ROOT, WS, SELF, die).
# Contract for this task says: log appends are silent on success, one stderr line on failure.
set -u

# Extract report paths: Owned lines + completion notify lines (same rule as resume.sh).
report_paths() {
  awk '/^[[:space:]]*-[[:space:]]*Owned:/ { print; next } /notify\.sh/ && /(완료|done|blocked|failed)/ { print }' "$1" |
    grep -Eo "$REPORT_RE" | awk '!seen[$0]++'
}

# Dispatch report guard: an existing report blocks dispatch unless forced
# or its first line is exactly "status: in-progress" (restartable unit, contract line 5).
guard_reports() {
  for report in "$@"; do
    [ -n "$report" ] || continue
    if [ "$FORCE_EXISTING_REPORT" -eq 0 ] && [ -e "$ROOT/$report" ]; then
      FL=$(head -n 1 "$ROOT/$report")
      case "$FL" in
        "status: in-progress") ;;
        *) die 1 "report already exists: $report (use --force-existing-report to override)";;
      esac
    fi
  done
}

# Look up a worker's current "<model> <effort>" via workers.sh --model; empty on failure.
# Forwards explicit context flags when dispatch was called with --workspace/--self-pane.
worker_model() {
  tgt=$1
  set -- "$HERE/workers.sh" --model
  [ "${WS_SET:-0}" = 1 ] && set -- "$@" --workspace "$WS"
  [ "${SELF_SET:-0}" = 1 ] && set -- "$@" --self-pane "$SELF"
  "$@" 2>/dev/null | awk -v t="$tgt" '
    $1==t { out=$4; for (i=5; i<=NF; i++) out=out" "$i } END { print out }'
}

# Append the two contract logs for a dispatch: dispatch.log and state.md.
# Formats: <UTC> dispatched <target> <unit> model=<model effort> / <UTC> <event> <pane> <unit> <detail>.
append_dispatch_logs() {
  ts=$1; tgt=$2; unit=$3; task_dir=$4
  wm=$(worker_model "$tgt") || wm=
  [ -n "$(printf '%s' "$wm" | tr -d '[:space:]')" ] && detail="model=$wm" || detail="model=?"
  if ! printf '%s dispatched %s %s %s\n' "$ts" "$tgt" "$unit" "$detail" >> "$task_dir/dispatch.log" 2>/dev/null; then
    echo "dispatch.sh: cannot write $task_dir/dispatch.log" >&2
  fi
  if ! printf '%s dispatched %s %s %s\n' "$ts" "$tgt" "$unit" "$detail" >> "$task_dir/state.md" 2>/dev/null; then
    echo "dispatch.sh: cannot write $task_dir/state.md" >&2
  fi
}
