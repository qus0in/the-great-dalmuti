#!/bin/sh
# Sync skills index in AGENTS.md from SKILL.md frontmatter. --check: diff only, exit 1 if stale.
set -eu
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
F="$ROOT/AGENTS.md"
LIST=$(mktemp); OUT=$(mktemp); trap 'rm -f "$LIST" "$OUT"' EXIT
for s in "$ROOT"/.agents/skills/*/SKILL.md; do
  [ -f "$s" ] || continue
  awk 'NR==1&&$0!="---"{exit} NR>1&&$0=="---"{exit}
       /^name:/{sub(/^name:[ ]*/,"");n=$0}
       /^description:/{sub(/^description:[ ]*/,"");gsub(/^["'"'"']|["'"'"']$/,"");d=$0}
       END{if(n!="")printf "- %s: %s\n",n,d}' "$s"
done > "$LIST"
awk -v L="$LIST" '/<!-- skills:begin -->/{print;while((getline l<L)>0)print l;skip=1;next}
  /<!-- skills:end -->/{skip=0} !skip' "$F" > "$OUT"
if [ "${1:-}" = --check ]; then cmp -s "$F" "$OUT" || { echo "index stale: run $0"; exit 1; }; exit 0; fi
cmp -s "$F" "$OUT" || cat "$OUT" > "$F"
echo "indexed $(wc -l < "$LIST" | tr -d ' ')"
