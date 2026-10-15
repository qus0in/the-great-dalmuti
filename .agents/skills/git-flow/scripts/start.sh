#!/bin/sh
# Usage: start.sh [--dry-run]
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
have_dev=0; remote_dev=0
if git show-ref --verify --quiet refs/heads/dev; then have_dev=1; fi
if [ "$have_dev" -eq 0 ]; then
  if git ls-remote --exit-code --heads origin dev >/dev/null 2>&1; then remote_dev=1; fi
fi
if [ "$have_dev" -eq 1 ]; then
  run_git checkout dev || exit 1
elif [ "$remote_dev" -eq 1 ]; then
  run_git fetch origin dev || exit 1
  run_git checkout --track origin/dev || exit 1
else
  run_git checkout main || exit 1
  run_git checkout -b dev main || exit 1
  run_git push -u origin dev || exit 1
fi
run_git checkout dev || true