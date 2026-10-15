#!/bin/sh
# Usage: sync.sh [--dry-run]
set -u
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd); cd "$ROOT" || exit 1
DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1
if [ "$DRY" -eq 1 ]; then
  printf '+ git fetch origin\n'
  printf '+ git checkout dev\n'
  printf '+ git merge --ff-only origin/main  # fallback: git merge --no-edit origin/main\n'
  exit 0
fi
[ -z "$(git status --porcelain)" ] || { echo "working tree dirty" >&2; exit 1; }
git show-ref --verify --quiet refs/heads/dev || { echo "no local dev branch" >&2; exit 1; }
git fetch origin || exit 1
git checkout dev || exit 1
if ! git merge --ff-only origin/main; then
  git merge --no-edit origin/main || exit 1
fi