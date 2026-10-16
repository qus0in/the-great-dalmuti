#!/bin/sh
# Usage: verify.sh <task> [rules|ui|all]   (default: all)
# Checkpoint gate runner for tmp/<task>/: runs the applicable deterministic gates and
# saves concise per-gate results. rules = codify/scripts/check.sh; ui = ui-prototype/check.sh <dist>.
# No caching: every invocation runs its requested gates. Reuse valid passed evidence by
# workflow policy (AGENTS.md Verification); never reuse failures. Rerun only on relevant
# input change, failure repair, or stated unresolved risk.
# stdout: "verify: <gate> pass|FAIL (exit N; log tmp/<task>/verify-<gate>.log)".
# Exit: 0 all gates pass; 1 any gate failed (independent gates still run); 2 usage/task.
# Writes only under tmp/<task>/; no browser, network, or new dependencies.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
usage() { echo "usage: $0 <task> [rules|ui|all]" >&2; exit 2; }
[ $# -ge 1 ] && [ $# -le 2 ] || usage
TASK=$1
GATES=${2:-all}
case "$TASK" in ''|*/*|.*) echo "verify.sh: invalid task name: $TASK" >&2; exit 2;; esac
case "$GATES" in rules|ui|all) ;; *) usage;; esac
TD="$ROOT/tmp/$TASK"
[ -d "$TD" ] || { echo "verify.sh: no task dir: tmp/$TASK" >&2; exit 2; }
cd "$ROOT" || exit 1

gate() { # $1 name; shift; run command, log, summarize; return the command's status
  g=$1; shift
  log="$TD/verify-$g.log"
  "$@" > "$log" 2>&1
  grc=$? # gate-local: must not clobber the aggregate status above
  if [ "$grc" -eq 0 ]; then
    echo "verify: $g pass (exit 0; log tmp/$TASK/verify-$g.log)"
  else
    echo "verify: $g FAIL (exit $grc; log tmp/$TASK/verify-$g.log)"
  fi
  return "$grc"
}

fail=0
case "$GATES" in
  rules|all) gate rules "$ROOT/.agents/skills/codify/scripts/check.sh" || fail=1;;
esac
case "$GATES" in
  ui|all) gate ui "$ROOT/.agents/skills/ui-prototype/scripts/check.sh" "$ROOT/src/ui/public" || fail=1;;
esac
if [ "$fail" -eq 0 ]; then echo "verify: pass"; exit 0; fi
echo "verify: FAIL"
exit 1
