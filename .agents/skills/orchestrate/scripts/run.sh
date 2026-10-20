#!/bin/sh
# Usage: run.sh <task> <unit> <author-label> <brief> [--reviewer R] [--criteria C]
# Start a write→review→fix loop: pre-create the review brief, record loop state,
# dispatch the author. Author tail (DISPATCH_TAIL): run handover.sh, not notify.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
die() { rc=$1; shift; echo "run.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 <task> <unit> <author-label> <brief> [--reviewer R] [--criteria C]"; }
[ $# -ge 4 ] || usage
TASK=$1; UNIT=$2; AUTHOR=$3; BRIEF=$4; shift 4
REVIEWER=r; CRIT=""
while [ $# -gt 0 ]; do case "$1" in
  --reviewer) [ $# -ge 2 ] || usage; REVIEWER=$2; shift 2;;
  --criteria) [ $# -ge 2 ] || usage; CRIT=$2; shift 2;;
  *) usage;; esac; done
case "$TASK" in ''|/*|*/*|.*) die 2 "invalid task: $TASK";; esac
case "$UNIT" in ''|/*|*/*) die 2 "invalid unit: $UNIT";; esac
case "$BRIEF" in /*) ;; *) BRIEF="$ROOT/$BRIEF";; esac
[ -f "$BRIEF" ] || die 1 "brief missing: $BRIEF"
TD="$ROOT/tmp/$TASK"; mkdir -p "$TD" || die 1 "cannot create $TD"
AREP=$(grep -Eo 'tmp/[A-Za-z0-9_.-]+/(report|review)-[A-Za-z0-9_.-]+\.md' "$BRIEF" | head -n 1)
[ -n "$AREP" ] || AREP="tmp/$TASK/report-$UNIT.md"
CRIT=$(printf '%s' "${CRIT:-author brief ## 완료 기준}" | tr '\n' ' ')
[ -n "$(printf '%s' "$CRIT" | tr -d ' ')" ] || die 2 "empty criteria"
SNAP="tmp/$TASK/snapshot-$UNIT.tar.gz"
RBRIEF="tmp/$TASK/brief-$REVIEWER-review-$UNIT.md"
RREP="tmp/$TASK/review-$REVIEWER-$UNIT.md"
if [ ! -e "$ROOT/$RBRIEF" ]; then
  "$HERE/brief.sh" review "$TASK" "$REVIEWER" unit="$UNIT" author="$AUTHOR" author_brief="$BRIEF" report="$AREP" snapshot="$SNAP" criteria="$CRIT" >/dev/null || exit $?
fi
CTX=${DISPATCH_CTX_CMD:-$HERE/context.sh}
NOTIFY=${LOOP_NOTIFY:-}
if [ -z "$NOTIFY" ]; then
  NOTIFY=$($CTX 2>/dev/null | jq -r '.self_pane // empty') || NOTIFY=
  [ -n "$NOTIFY" ] || die 1 "cannot resolve notify pane (set LOOP_NOTIFY)"
fi
{
printf 'round=0\n'
printf 'author=%s\n' "$AUTHOR"
printf 'reviewer=%s\n' "$REVIEWER"
printf 'brief=%s\n' "$BRIEF"
printf 'review_brief=%s\n' "$RBRIEF"
printf 'report=%s\n' "$AREP"
printf 'review_report=%s\n' "$RREP"
printf 'snapshot=%s\n' "$SNAP"
printf 'criteria=%s\n' "$CRIT"
printf 'notify=%s\n' "$NOTIFY"
} > "$TD/loop-$UNIT.state" || die 1 "cannot write state"
TAIL="추가 루프 지시(위 콜백 지시보다 우선): 완료하면 notify.sh를 실행하지 말고 \`$HERE/handover.sh $TASK $UNIT\`을 실행하라. 보고서 첫머리에 status/blocking/summary 블록과 \`files:\` 줄(소유 산출물 repo-relative 경로, 공백 구분)을 적어라."
DISPATCH_TAIL="$TAIL" "$HERE/dispatch.sh" --notify "$NOTIFY" "$AUTHOR" "$BRIEF"
