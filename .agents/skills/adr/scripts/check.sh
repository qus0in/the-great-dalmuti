#!/bin/sh
# Validate docs/adr format and index freshness.
# Usage: check.sh [files...]
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
D="$ROOT/docs/adr"
E=0; err(){ echo "$*"; E=1; }

if [ $# -eq 0 ]; then
  set -- "$D"/[0-9]*.md
  [ -e "$1" ] || { echo "ok"; exit 0; }
fi

for f in "$@"; do
  [ -f "$f" ] || { err "$f: file not found"; continue; }
  base=$(basename "$f")
  echo "$base" | grep -Eq '^[0-9]{4}-[a-z0-9.-]+\.md$' || { err "$base: filename must be NNNN-<slug>.md"; continue; }
  num=$(echo "$base" | cut -d'-' -f1)

  h1=$(head -1 "$f")
  echo "$h1" | grep -Eq '^# ADR-[0-9]{4}: .+$' || err "$base: H1 must be '# ADR-NNNN: <title>'"
  h1_num=$(echo "$h1" | sed -E 's/^# ADR-([0-9]{4}): .*/\1/')
  [ "$h1_num" = "$num" ] || err "$base: H1 number ($h1_num) != filename number ($num)"

  why_ln=$(grep -n '^## Why$' "$f" | head -1 | cut -d: -f1 || true)
  what_ln=$(grep -n '^## What$' "$f" | head -1 | cut -d: -f1 || true)
  how_ln=$(grep -n '^## How$' "$f" | head -1 | cut -d: -f1 || true)

  [ -n "$why_ln" ] || err "$base: missing '## Why'"
  [ -n "$what_ln" ] || err "$base: missing '## What'"
  [ -n "$how_ln" ] || err "$base: missing '## How'"

  if [ -n "$why_ln" ] && [ -n "$what_ln" ] && [ -n "$how_ln" ]; then
    if [ "$why_ln" -ge "$what_ln" ] || [ "$what_ln" -ge "$how_ln" ]; then
      err "$base: sections not in order (Why -> What -> How)"
    fi

    # Header bullets between H1 and ## Why
    hdr=$(sed -n "2,$((why_ln-1))p" "$f")
    echo "$hdr" | grep -Eq '^- 상태: (draft|accepted|superseded|deprecated)( \(.*\))?$' || err "$base: missing or invalid '- 상태:'"
    echo "$hdr" | grep -Eq '^- 날짜: [0-9]{4}-[0-9]{2}-[0-9]{2}$' || err "$base: missing or invalid '- 날짜:'"
    bad_bullets=$(echo "$hdr" | grep '^- ' | grep -vE '^- (상태|날짜|관련|관련 이슈|이력|출처):' || true)
    [ -z "$bad_bullets" ] || err "$base: unknown header bullet(s): $bad_bullets"

    # What section must contain confirmed section
    what_sec=$(sed -n "$((what_ln+1)),$((how_ln-1))p" "$f")
    echo "$what_sec" | grep -Eq '^### 확정' || err "$base: What section missing '### 확정 결정' (or '### 확정')"
  fi
done

if ! idx_err=$("$HERE/index.sh" --check 2>&1); then
  err "docs/adr/README.md stale: $idx_err -> run $HERE/index.sh"
fi

[ $E -eq 0 ] && echo "ok"
exit $E
