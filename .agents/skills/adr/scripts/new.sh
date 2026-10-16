#!/bin/sh
# Usage: new.sh <slug> "<title ko>"
# Creates next-numbered docs/adr/NNNN-<slug>.md from template, rebuilds docs/adr/README.md.
set -eu
[ $# -ge 2 ] || { echo "usage: $0 <slug> <title>" >&2; exit 2; }
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
SLUG=$1; TITLE=$2
echo "$SLUG" | grep -Eq '^[a-z0-9][a-z0-9.-]*$' || { echo "bad slug: $SLUG" >&2; exit 2; }
D="$ROOT/docs/adr"; mkdir -p "$D"
ls "$D" 2>/dev/null | grep -Eq "^[0-9]{4}-$SLUG\.md$" && { echo "exists: $SLUG" >&2; exit 1; }

LAST=$(ls "$D"/[0-9]*.md 2>/dev/null | sed 's/.*\/\([0-9]*\)-.*/\1/' | sort -n | tail -1 || true)
if [ -z "$LAST" ]; then
  NNNN="0001"
else
  LAST_DEC=$(echo "$LAST" | sed 's/^0*//')
  [ -n "$LAST_DEC" ] || LAST_DEC=0
  NNNN=$(printf "%04d" $((LAST_DEC + 1)))
fi

F="$D/$NNNN-$SLUG.md"
DAY=$(date +%F)

cat <<EOF > "$F"
# ADR-$NNNN: $TITLE

- 상태: draft
- 날짜: $DAY
- 관련:
- 관련 이슈:
- 출처:

## Why

<!-- 결정 배경, 해결하려는 문제, 결정의 동기 -->

## What

### 확정 결정

<!-- 사용자가 명시적으로 결정한 항목 (확정 외의 내용은 결정된 것으로 다루지 않음) -->

### 제안 (공학적 수단, 사용자 명시 선택 아님)

<!-- 미결 과제를 풀기 위해 제안하는 수단 (필요 시 작성) -->

### 미결 (임의 결정 금지)

<!-- 사용자가 아직 결정하지 않은 항목 (임의 결정 금지) 또는 '없음' -->

### 대안 비교 (작성자 분석, 사용자 결정 아님)

| 대안 | 강점 | 약점 | 기회 | 위협 |
| --- | --- | --- | --- | --- |
| <!-- 대안 1 --> | | | | |

## How

<!-- 기존 제약 및 아키텍처 원칙, 이슈 매핑, 후속 작업 -->
EOF

"$HERE/index.sh" >/dev/null
echo "docs/adr/$(basename "$F")"
