#!/bin/sh
# Validate layout, skills, scripts, index, and the 100-line gate. Prints "ok" or problems; exit 1 on problems.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd); cd "$ROOT"
E=0; err(){ echo "ERR $*"; E=1; }
warn(){ echo "WARN $*"; }
AGENTS_WARN_BYTES=${AGENTS_WARN_BYTES:-16384}
AGENTS_MAX_BYTES=${AGENTS_MAX_BYTES:-24576}
[ ! -f .agents/project.conf ] || . ./.agents/project.conf
[ "$(readlink CLAUDE.md)" = AGENTS.md ] || err "CLAUDE.md must symlink AGENTS.md"
[ "$(readlink .claude/skills)" = ../.agents/skills ] || err ".claude/skills must symlink ../.agents/skills"
for d in tmp docs .agents/skills; do [ -d "$d" ] || err "missing dir $d"; done
grep -q '<!-- skills:begin -->' AGENTS.md && grep -q '<!-- skills:end -->' AGENTS.md || err "AGENTS.md index markers missing"
if [ -f AGENTS.md ]; then
  agents_bytes=$(wc -c < AGENTS.md | tr -d ' ')
  if [ "$agents_bytes" -gt "$AGENTS_MAX_BYTES" ]; then
    err "AGENTS.md size ${agents_bytes}B > ${AGENTS_MAX_BYTES}B (truncation limit)"
  elif [ "$agents_bytes" -gt "$AGENTS_WARN_BYTES" ]; then
    warn "AGENTS.md size ${agents_bytes}B > ${AGENTS_WARN_BYTES}B (approaching 24KB limit)"
  fi
fi
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
if [ -x .agents/skills/layers/scripts/check.sh ]; then
  if ! layers_out=$(.agents/skills/layers/scripts/check.sh 2>&1); then
    while IFS= read -r l; do
      [ -n "$l" ] || continue
      err "layers: $l"
    done <<EOF
$layers_out
EOF
  fi
fi
if git rev-parse --git-dir >/dev/null 2>&1; then
  t=$(git ls-files tmp | grep -v '\.gitkeep$' || true)
  [ -z "$t" ] || err "tracked files in tmp/: $t"
fi
if ! refs=$("$HERE/tmp-refs.sh" 2>&1); then
  err "temporary references: $refs"
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
