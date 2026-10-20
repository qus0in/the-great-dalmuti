#!/bin/sh
# Usage: verdict.sh <task> <unit>
# Reviewer end-of-review: verify snapshot, read verdict:. accept -> notify o once
# (author+review summaries); block -> fix brief + author --continue (round<2),
# final blocked notify at round 2; snapshot differ -> scope notify to o.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
die() { rc=$1; shift; echo "verdict.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 <task> <unit>"; }
[ $# -eq 2 ] || usage
TASK=$1; UNIT=$2
case "$TASK" in ''|/*|*/*|.*) die 2 "invalid task";; esac
case "$UNIT" in ''|/*|*/*) die 2 "invalid unit";; esac
ST="$ROOT/tmp/$TASK/loop-$UNIT.state"
[ -f "$ST" ] || die 1 "no loop state: $ST"
val() { sed -n "s/^$2=//p" "$1" | head -n 1; }
report=$(val "$ST" report); rrep=$(val "$ST" review_report); author=$(val "$ST" author)
notify=$(val "$ST" notify); round=$(val "$ST" round); criteria=$(val "$ST" criteria)
[ -f "$ROOT/$rrep" ] || die 1 "review report missing: $rrep"
if ! "$HERE/snapshot.sh" verify "$TASK" "$UNIT" >/dev/null 2>&1; then
  "$HERE/notify.sh" --with-summary --status blocked --unit "$UNIT" "$notify" "$rrep" "scope violation: tree differs from snapshot" || exit $?
  exit 0
fi
verdict=$(awk 'NR<=20 && /^verdict:/ {print $2; exit}' "$ROOT/$rrep")
asum=$("$HERE/summary.sh" "$ROOT/$report" 2>/dev/null | tr '\n' '|' | head -c 600)
case "$verdict" in
  accept)
    "$HERE/notify.sh" --with-summary --status done --unit "$UNIT" "$notify" "$rrep" "loop accept $UNIT author=$author [$asum]" || exit $?;;
  block)
    if [ "${round:-0}" -ge 2 ]; then
      "$HERE/notify.sh" --with-summary --status blocked --unit "$UNIT" "$notify" "$rrep" "loop blocked $UNIT round 2 author=$author [$asum]" || exit $?
      exit 0
    fi
    N=$((${round:-0} + 1))
    BLK=$(awk '/^## 차단/{f=1; print; next} /^## [Bb][Ll][Oo][Cc][Kk][Ii][Nn][Gg]/{f=1; print; next} /^## /{f=0} f' "$ROOT/$rrep")
    [ -n "$BLK" ] || BLK="(차단 절 없음 — 리뷰 본문 참조: $rrep)"
    FIXB="tmp/$TASK/brief-$author-$UNIT-fix$N.md"
    printf '# 수정 %s (round %s) — 차단 항목만\n\n## 왜\n%s(verdict: block) 차단 항목만 수정한다.\n\n## 무엇\n%s\n\n## 완료 기준 (고정 — 변경 금지)\n%s\n\n- Owned: %s\n' "$UNIT" "$N" "$rrep" "$BLK" "$criteria" "$report" > "$ROOT/$FIXB" || die 1 "cannot write fix brief"
    awk -v n="$N" '{sub(/^round=.*/, "round="n); print}' "$ST" > "$ST.tmp" && mv "$ST.tmp" "$ST"
    TAIL="추가 루프 지시(위 콜백 지시보다 우선): 차단 항목만 수정하고 보고서를 갱신한 뒤 notify.sh 대신 \`$HERE/handover.sh $TASK $UNIT\`을 실행하라. 보고서 첫머리에 status/blocking/summary 블록과 \`files:\` 줄을 유지하라."
    DISPATCH_TAIL="$TAIL" "$HERE/dispatch.sh" --notify "$notify" --continue --force-existing-report "$author" "$ROOT/$FIXB";;
  *) die 1 "no verdict: line in $rrep";;
esac
