#!/bin/sh
# Usage: start.sh [--dry-run]
set -u
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd); cd "$ROOT" || exit 1
DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1
if [ "$DRY" -eq 1 ]; then
  printf '+ if origin/dev exists: git fetch origin dev; git checkout --track origin/dev\n'
  printf '+ else: git checkout main; git checkout -b dev main; git push -u origin dev\n'
  printf '+ git checkout dev\n'
  exit 0
fi
if git show-ref --verify --quiet refs/heads/dev; then
  git checkout dev || exit 1
elif git ls-remote --exit-code --heads origin dev >/dev/null 2>&1; then
  git fetch origin dev || exit 1
  git checkout --track origin/dev || exit 1
else
  git checkout main || exit 1
  git checkout -b dev main || exit 1
  git push -u origin dev || exit 1
fi
git checkout dev >/dev/null 2>&1 || true