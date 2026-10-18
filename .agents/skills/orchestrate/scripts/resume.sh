#!/bin/sh
# Usage: resume.sh <brief-path> [--lines N]
# Generate continuation brief on stdout from original brief, progress, report, and git status.
# Exit 0 on success; 1 if brief missing; 2 on bad args.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
die() { rc=$1; shift; echo "resume.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 <brief-path> [--lines N]"; }

BRIEF=""; LINES=5
while [ $# -gt 0 ]; do
  case "$1" in
    --lines) [ $# -ge 2 ] || usage; LINES=$2; shift 2;;
    -*) usage;;
    *) [ -z "$BRIEF" ] || usage; BRIEF=$1; shift;;
  esac
done
[ -n "$BRIEF" ] || usage
case "$LINES" in ''|*[!0-9]*) die 2 "invalid --lines: $LINES";; esac
[ "$LINES" -gt 0 ] || die 2 "--lines must be positive: $LINES"

case "$BRIEF" in
  /*) FULL_BRIEF="$BRIEF";;
  *) [ -f "$ROOT/$BRIEF" ] && FULL_BRIEF="$ROOT/$BRIEF" || FULL_BRIEF="$(cd "$(dirname "$BRIEF")" 2>/dev/null && pwd)/$(basename "$BRIEF")";;
esac
[ -f "$FULL_BRIEF" ] || die 1 "brief missing: $BRIEF"

FNAME=$(basename "$FULL_BRIEF"); UNIT=${FNAME#brief-}; UNIT=${UNIT%.md}
BDIR=$(dirname "$FULL_BRIEF"); TASK=$(basename "$BDIR")
PROGRESS_FILE="$BDIR/progress-$UNIT.md"
HAS_PROGRESS=0; [ -s "$PROGRESS_FILE" ] && HAS_PROGRESS=1

REPORT_RE='tmp/[[:alnum:]_.-]+/(report|review)-[[:alnum:]_.-]+\.md'
REP_BRIEF=$(awk '/^[[:space:]]*-[[:space:]]*Owned:/ { print; next } /notify\.sh/ && /(완료|done|blocked|failed)/ { print }' "$FULL_BRIEF" 2>/dev/null | grep -Eo "$REPORT_RE" | head -n 1 || true)
if [ -n "$REP_BRIEF" ] && [ -f "$ROOT/$REP_BRIEF" ]; then REPORT_FILE="$ROOT/$REP_BRIEF"
elif [ -f "$BDIR/report-$UNIT.md" ]; then REPORT_FILE="$BDIR/report-$UNIT.md"
elif [ -f "$BDIR/review-$UNIT.md" ]; then REPORT_FILE="$BDIR/review-$UNIT.md"
elif [ -n "$REP_BRIEF" ]; then REPORT_FILE="$ROOT/$REP_BRIEF"
else REPORT_FILE="$BDIR/report-$UNIT.md"
fi
HAS_REPORT=0; [ -s "$REPORT_FILE" ] && HAS_REPORT=1

printf '# brief %s-resume — 재개 브리프\n\n' "$UNIT"
if [ "$HAS_PROGRESS" -eq 1 ]; then
  printf '> 이전 실행이 끊겼다. 아래 progress 다음 단계부터 이어서, 이미 끝난 단계는 반복하지 말 것.\n\n'
elif [ "$HAS_REPORT" -eq 1 ]; then
  printf '> 이전 실행의 progress 파일이 없습니다. 보고서 상태를 확인하고 다음 단계부터 이어서 수행하십시오.\n\n'
else
  printf '> 이전 실행의 progress 및 보고서가 없습니다. 원 브리프 전체를 처음부터 재수행하십시오.\n\n'
fi

printf '## 재개 정보\n- 원 브리프: %s\n- 태스크: %s\n- 유닛: %s\n\n' "$BRIEF" "$TASK" "$UNIT"
printf '## 진행 상황 (progress)\n'
if [ "$HAS_PROGRESS" -eq 1 ]; then
  printf '```\n'; tail -n "$LINES" "$PROGRESS_FILE"; printf '```\n\n'
else
  printf 'progress 기록 없음 (%s)\n\n' "$PROGRESS_FILE"
fi

printf '## 보고서 현재 상태\n'
if [ "$HAS_REPORT" -eq 1 ]; then
  printf -- '- 보고서 경로: %s\n```\n' "$REPORT_FILE"; cat "$REPORT_FILE"; printf '```\n\n'
elif [ -f "$REPORT_FILE" ]; then
  printf -- '- 보고서 경로: %s (빈 파일)\n\n' "$REPORT_FILE"
else
  printf -- '- 보고서 파일 없음 (%s)\n\n' "$REPORT_FILE"
fi

printf '## 소유 파일 변경 상태 (git status --porcelain)\n'
GIT_OUT=$(git -C "$ROOT" status --porcelain 2>/dev/null || git -C "$BDIR" status --porcelain 2>/dev/null || true)
MATCHED=""
if [ -n "$GIT_OUT" ]; then
  PATS=$(printf '%s\n%s\n' "$(grep -E '^[[:space:]]*-?[[:space:]]*Owned:' "$FULL_BRIEF" 2>/dev/null)" "$(awk '/^## 무엇을/{flag=1; next} /^## /{flag=0} flag' "$FULL_BRIEF" 2>/dev/null)" | grep -Eo '(\.?[a-zA-Z0-9_.-]+(/[a-zA-Z0-9_.-]+)*\.[a-zA-Z0-9]+)' || true)
  PATS=$(printf '%s\nprogress-%s\nreport-%s\nreview-%s\n' "$PATS" "$UNIT" "$UNIT" "$UNIT")
  FORBID=$(grep -E '^[[:space:]]*-?[[:space:]]*Forbidden:' "$FULL_BRIEF" 2>/dev/null | grep -Eo '(\.?[a-zA-Z0-9_.-]+(/[a-zA-Z0-9_.-]+)*\.[a-zA-Z0-9]+)' || true)
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    fpath=${line#???}; fpath=${fpath#* -> }
    is_forbid=0
    for fb in $FORBID; do case "$fpath" in *"$fb"*) is_forbid=1; break;; esac; done
    [ "$is_forbid" -eq 0 ] || continue
    for pat in $PATS; do
      case "$fpath" in
        *"$pat"*) [ -n "$MATCHED" ] || printf '```\n'; printf '%s\n' "$line"; MATCHED=1; break;;
      esac
    done
  done <<EOF
$GIT_OUT
EOF
  [ -n "$MATCHED" ] && printf '```\n'
fi
[ -n "$MATCHED" ] || printf '소유 파일 변경 사항 없음\n'
