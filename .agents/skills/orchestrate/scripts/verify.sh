#!/bin/sh
# Usage: verify.sh <task> [rules|ui|format|lint|test|all]   (default: all)
# Checkpoint gate runner for tmp/<task>/: runs the applicable deterministic gates and
# saves concise per-gate results. rules = codify check; ui = lines + layers + UI contract;
# format = npm run format:check; lint = npm run lint; test = npm test.
# No caching: every invocation runs its requested gates. Reuse valid passed evidence by
# workflow policy (AGENTS.md Verification); never reuse failures. Rerun only on relevant
# input change, failure repair, or stated unresolved risk.
# stdout: "verify: <gate> pass|FAIL (exit N; log tmp/<task>/verify-<gate>.log)".
# Exit: 0 all gates pass; 1 any gate failed (independent gates still run); 2 usage/task.
# Writes only under tmp/<task>/; no browser, network, or new dependencies.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
usage() { echo "usage: $0 <task> [rules|ui|format|lint|test|all]" >&2; exit 2; }
[ $# -ge 1 ] && [ $# -le 2 ] || usage
TASK=$1
GATES=${2:-all}
case "$TASK" in ''|*/*|.*) echo "verify.sh: invalid task name: $TASK" >&2; exit 2;; esac
case "$GATES" in rules|ui|format|lint|test|all) ;; *) usage;; esac
TD="$ROOT/tmp/$TASK"
[ -d "$TD" ] || { echo "verify.sh: no task dir: tmp/$TASK" >&2; exit 2; }
cd "$ROOT" || exit 1
CONF="$ROOT/.agents/project.conf"
if [ -f "$CONF" ]; then . "$CONF"; fi
UI_CHECK_TARGET=${UI_CHECK_TARGET:-}

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
  ui|all)
    gate lines "$ROOT/.agents/skills/codify/scripts/lines.sh" || fail=1
    gate layers "$ROOT/.agents/skills/layers/scripts/check.sh" || fail=1
    if [ -n "$UI_CHECK_TARGET" ]; then
      gate ui "$ROOT/.agents/skills/ui-prototype/scripts/check.sh" "$ROOT/$UI_CHECK_TARGET" || fail=1
    else
      echo "verify: ui skip (no UI_CHECK_TARGET in .agents/project.conf, generic defaults)"
    fi;;
esac
case "$GATES" in
  format|all) gate format npm run format:check || fail=1;;
esac
case "$GATES" in
  lint|all) gate lint npm run lint || fail=1;;
esac
case "$GATES" in
  test|all) gate test npm test || fail=1;;
esac
if [ "$fail" -eq 0 ]; then echo "verify: pass"; exit 0; fi
echo "verify: FAIL"
exit 1
