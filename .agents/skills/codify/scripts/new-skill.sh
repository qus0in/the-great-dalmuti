#!/bin/sh
# Usage: new-skill.sh <name> "<description>"  -> scaffold .agents/skills/<name>/SKILL.md, reindex.
set -eu
[ $# -eq 2 ] || { echo "usage: $0 <name> \"<description>\"" >&2; exit 2; }
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd)
N=$1; D=$2
echo "$N" | grep -Eq '^[a-z0-9][a-z0-9-]*$' || { echo "bad name: $N" >&2; exit 2; }
case "$D" in *": "*) echo "description must not contain ': '" >&2; exit 2;; esac
DIR="$ROOT/.agents/skills/$N"
[ -e "$DIR" ] && { echo "exists: $DIR" >&2; exit 1; }
mkdir -p "$DIR"
printf -- '---\nname: %s\ndescription: %s\n---\n# %s\n' "$N" "$D" "$N" > "$DIR/SKILL.md"
"$(dirname "$0")/index.sh" >/dev/null
echo "created .agents/skills/$N/SKILL.md"
