#!/bin/sh
# Usage: sync.sh [--dry-run]
set -u
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd); cd "$ROOT" || exit 1
DRY=0
shq() {
  _q=$1; _out="'"
  while :; do
    case "$_q" in
      *"'"*) _out="$_out${_q%%\'*}'\''"; _q=${_q#*\'};;
      *) break;;
    esac
  done
  printf "%s%s'" "$_out" "$_q"
}
run_git() {
  if [ "$DRY" -eq 1 ]; then
    printf '+ git'
    for _a in "$@"; do printf ' %s' "$(shq "$_a")"; done
    printf '\n'
  else
    git "$@"
  fi
}
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1; shift;;
    --) shift; break;;
    -*) echo "unknown option: $1" >&2; exit 2;;
    *) echo "unexpected arg: $1" >&2; exit 2;;
  esac
done
[ $# -eq 0 ] || { echo "unexpected arg: $1" >&2; exit 2; }
[ -z "$(git status --porcelain)" ] || { echo "working tree dirty" >&2; exit 1; }
git show-ref --verify --quiet refs/heads/dev || { echo "no local dev branch" >&2; exit 1; }
run_git fetch origin || exit 1
run_git checkout dev || exit 1
do_merge() {
  if run_git merge --ff-only origin/main; then
    return 0
  else
    run_git merge --no-edit origin/main
  fi
}
do_merge || exit 1
if [ "$DRY" -eq 1 ]; then
  printf '# note: fallback merge --no-edit runs only if ff fails at runtime\n'
fi