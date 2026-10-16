#!/bin/sh
# Rebuild docs/adr/README.md from ADR titles, status, and dates. --check: exit 1 if stale.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); D=$(cd "$HERE/../../../.." && pwd)/docs/adr
mkdir -p "$D"; OUT=$(mktemp); trap 'rm -f "$OUT"' EXIT
{
  printf '# 아키텍처 결정 기록 (ADR)\n\n'
  printf '프로젝트 아키텍처 및 설계 결정을 기록한 문서 목록. `adr` 스킬로 관리되며 직접 편집하지 않음.\n\n'
  printf '| 번호 | 제목 | 상태 | 날짜 |\n'
  printf '| --- | --- | --- | --- |\n'
  for f in "$D"/[0-9]*.md; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    num=$(echo "$base" | cut -d'-' -f1)
    title=$(head -1 "$f" | sed 's/^# ADR-[0-9]*:[ ]*//')
    status=$(grep '^- 상태:' "$f" | head -1 | sed 's/^- 상태:[ ]*//')
    date=$(grep '^- 날짜:' "$f" | head -1 | sed 's/^- 날짜:[ ]*//')
    printf '| [%s](%s) | [%s](%s) | %s | %s |\n' "$num" "$base" "$title" "$base" "$status" "$date"
  done
} > "$OUT"
if [ "${1:-}" = --check ]; then
  cmp -s "$OUT" "$D/README.md" || { echo "adr index stale"; exit 1; }
  exit 0
fi
cat "$OUT" > "$D/README.md"
