#!/bin/sh
# Validate layout, skills, scripts, index, and the 100-line gate. Prints "ok" or problems; exit 1 on problems.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd); cd "$ROOT"
E=0; err(){ echo "ERR $*"; E=1; }
[ "$(readlink CLAUDE.md)" = AGENTS.md ] || err "CLAUDE.md must symlink AGENTS.md"
[ "$(readlink .claude/skills)" = ../.agents/skills ] || err ".claude/skills must symlink ../.agents/skills"
for d in tmp docs .agents/skills; do [ -d "$d" ] || err "missing dir $d"; done
grep -q '<!-- skills:begin -->' AGENTS.md && grep -q '<!-- skills:end -->' AGENTS.md || err "AGENTS.md index markers missing"
for dir in .agents/skills/*/; do
  [ -d "$dir" ] || continue
  n=$(basename "$dir"); s="$dir/SKILL.md"
  [ -f "$s" ] || { err "$n: no SKILL.md"; continue; }
  [ "$(head -1 "$s")" = --- ] || err "$n: no frontmatter"
  fm=$(awk 'NR>1&&$0=="---"{exit} NR>1' "$s")
  echo "$fm" | grep -qx "name: $n" || err "$n: name != dir"
  dl=$(echo "$fm" | grep '^description:' | sed 's/^description:[ ]*//')
  [ -n "$dl" ] || err "$n: empty description"
  case "$dl" in *": "*) err "$n: description contains ': '";; esac
  lines=$(awk 'f>=2{c++} /^---$/{f++} END{print c+0}' "$s")
  [ "$lines" -le 80 ] || err "$n: SKILL.md body $lines lines (>80) -> split to references/"
  [ "$n" = codify ] || [ ! -x "${dir}scripts/index.sh" ] || "${dir}scripts/index.sh" --check >/dev/null || err "$n: generated index stale -> run ${dir}scripts/index.sh"
  for f in "$dir"scripts/*; do [ -e "$f" ] || continue; [ -x "$f" ] || err "$n: not executable $f"; done
done
"$HERE/index.sh" --check >/dev/null || err "AGENTS.md skills index stale -> run index.sh"
if [ -x .agents/skills/adr/scripts/check.sh ]; then
  if ! adr_out=$(.agents/skills/adr/scripts/check.sh 2>&1); then
    while IFS= read -r l; do
      [ -n "$l" ] || continue
      err "adr: $l"
    done <<EOF
$adr_out
EOF
  fi
fi
if git rev-parse --git-dir >/dev/null 2>&1; then
  t=$(git ls-files tmp | grep -v '\.gitkeep$' || true)
  [ -z "$t" ] || err "tracked files in tmp/: $t"
  r=$(grep -rln --exclude-dir=prompt 'tmp/[A-Za-z0-9_-]' docs .agents/skills 2>/dev/null | grep -v '/codify/' || true)
  [ -z "$r" ] || err "references to tmp/ paths: $r"
fi
if ! lo=$("$HERE/lines.sh" 2>&1); then
  while IFS= read -r l; do
    [ -n "$l" ] || continue
    err "line limit: $l"
  done <<EOF
$lo
EOF
fi
[ $E -eq 0 ] && echo ok
exit $E
