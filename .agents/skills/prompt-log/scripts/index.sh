#!/bin/sh
# Rebuild docs/prompt/README.md from entry titles. --check: exit 1 if stale.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); D=$(cd "$HERE/../../../.." && pwd)/docs/prompt
mkdir -p "$D"; OUT=$(mktemp); trap 'rm -f "$OUT"' EXIT
{ printf '# 프롬프트 기록\n\n체계·규칙·작업 방식을 정한 사용자 프롬프트 원문 모음. `prompt-log` 스킬로 생성되며 직접 편집하지 않음.\n\n'
  for f in "$D"/[0-9]*.md; do [ -f "$f" ] || continue
    printf -- '- [%s](%s) — %s\n' "$(basename "$f" .md | cut -c1-10)" "$(basename "$f")" "$(head -1 "$f" | sed 's/^# //')"; done; } > "$OUT"
if [ "${1:-}" = --check ]; then cmp -s "$OUT" "$D/README.md" || { echo "prompt index stale"; exit 1; }; exit 0; fi
cat "$OUT" > "$D/README.md"
