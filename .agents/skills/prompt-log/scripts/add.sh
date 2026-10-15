#!/bin/sh
# Usage: add.sh <slug> "<title>" "<outcome paths>" ["<intent>"] < prompt.txt
# Writes docs/prompt/<date>-<NN>-<slug>.md (prompt verbatim from stdin), rebuilds docs/prompt/README.md.
set -eu
[ $# -ge 3 ] || { echo "usage: $0 <slug> <title> <outcome> [intent] < prompt" >&2; exit 2; }
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
SLUG=$1; TITLE=$2; OUTC=$3; INTENT=${4:-}
echo "$SLUG" | grep -Eq '^[a-z0-9][a-z0-9-]*$' || { echo "bad slug: $SLUG" >&2; exit 2; }
D="$ROOT/docs/prompt"; mkdir -p "$D"
ls "$D" | grep -Eq "^[0-9-]+-$SLUG\.md$" && { echo "exists: $SLUG" >&2; exit 1; }
P=$(cat); [ -n "$P" ] || { echo "empty prompt on stdin" >&2; exit 2; }
DAY=${PROMPT_DATE:-$(date +%F)}
N=$(ls "$D" | grep -c "^$DAY-" || true); NN=$(printf %02d $((N+1)))
F="$D/$DAY-$NN-$SLUG.md"
{ printf '# %s\n\n- 날짜: %s\n- 결과: %s\n\n## 원문\n\n```text\n%s\n```\n' "$TITLE" "$DAY" "$OUTC" "$P"
  [ -z "$INTENT" ] || printf '\n## 의도\n\n%s\n' "$INTENT"; } > "$F"
"$HERE/index.sh" >/dev/null
echo "docs/prompt/$(basename "$F")"
