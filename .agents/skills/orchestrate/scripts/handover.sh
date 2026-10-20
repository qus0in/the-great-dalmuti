#!/bin/sh
# Usage: handover.sh <task> <unit>
# Author end-of-work: snapshot owned files, dispatch reviewer (tail: run verdict.sh).
# Author status blocked|failed -> notify o directly (with summary), no review.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
die() { rc=$1; shift; echo "handover.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 <task> <unit>"; }
[ $# -eq 2 ] || usage
TASK=$1; UNIT=$2
case "$TASK" in ''|/*|*/*|.*) die 2 "invalid task";; esac
case "$UNIT" in ''|/*|*/*) die 2 "invalid unit";; esac
ST="$ROOT/tmp/$TASK/loop-$UNIT.state"
[ -f "$ST" ] || die 1 "no loop state: $ST"
val() { sed -n "s/^$2=//p" "$1" | head -n 1; }
report=$(val "$ST" report); rrep=$(val "$ST" review_report); rbrief=$(val "$ST" review_brief)
reviewer=$(val "$ST" reviewer); notify=$(val "$ST" notify); round=$(val "$ST" round)
brief=$(val "$ST" brief); criteria=$(val "$ST" criteria)
[ -n "$report" ] && [ -f "$ROOT/$report" ] || die 1 "author report missing: $report"
case "$(head -n 1 "$ROOT/$report")" in
  "status: blocked"|"status: failed")
    st=$(head -n 1 "$ROOT/$report"); st=${st#status: }
    "$HERE/notify.sh" --with-summary --status "$st" --unit "$UNIT" "$notify" "$report" "author $st, no review" || exit $?
    exit 0;;
esac
files=$(awk 'NR<=20 && /^files:/ {sub(/^files:[ \t]*/,""); print; exit}' "$ROOT/$report")
[ -n "$files" ] || die 1 "author report has no files: line"
ARC="$ROOT/$(val "$ST" snapshot)"; [ ! -e "$ARC" ] || rm -f "$ARC"
"$HERE/snapshot.sh" create "$TASK" "$UNIT" $files || exit $?
TAIL="추가 루프 지시(위 콜백 지시보다 우선): 리뷰 보고서($rrep: 첫머리 요약 블록+verdict: accept|block, ## 차단 절 포함 STAR)를 쓰고 notify.sh 대신 \`$HERE/verdict.sh $TASK $UNIT\`을 실행하라. 판정은 $brief 완료 기준($criteria)만으로."
if [ "${round:-0}" -gt 0 ]; then
  DISPATCH_TAIL="$TAIL" "$HERE/dispatch.sh" --notify "$notify" --force-existing-report "$reviewer" "$ROOT/$rbrief"
else
  DISPATCH_TAIL="$TAIL" "$HERE/dispatch.sh" --notify "$notify" "$reviewer" "$ROOT/$rbrief"
fi
