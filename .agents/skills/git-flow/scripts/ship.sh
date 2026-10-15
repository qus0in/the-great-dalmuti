#!/bin/sh
# Usage: ship.sh "<title>" ["<body>"] [--merge] [--dry-run]
set -u
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd); cd "$ROOT" || exit 1
TITLE=""; BODY=""; MERGE=0; DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --merge) MERGE=1; shift;;
    --dry-run) DRY=1; shift;;
    --) shift; break;;
    *)
      if [ -z "$TITLE" ]; then TITLE=$1
      elif [ -z "$BODY" ]; then BODY=$1
      else echo "unexpected arg: $1" >&2; exit 2; fi
      shift;;
  esac
done
[ -n "$TITLE" ] || { echo "usage: $0 <title> [body] [--merge] [--dry-run]" >&2; exit 2; }
body_arg=
[ -n "$BODY" ] && body_arg=" --body \"$BODY\""
if [ "$DRY" -eq 1 ]; then
  printf '+ git push -u origin dev\n'
  printf '+ PR=$(gh pr list --base main --head dev --state open --json url --jq '"'"'.[0].url'"'"')\n'
  printf '+ [ -z "$PR" ] && gh pr create --base main --head dev --title "%s"%s\n' "$TITLE" "$body_arg"
  printf '+ printf %%s\\\\n "$PR"\n'
  if [ "$MERGE" -eq 1 ]; then
    printf '+ gh pr merge "$PR" --merge\n'
    printf '+ git fetch origin main\n'
    printf '+ git checkout main\n'
    printf '+ git merge --ff-only origin/main\n'
    printf '+ git checkout dev\n'
    printf '+ git merge --ff-only origin/main\n'
  fi
  exit 0
fi
cur=$(git branch --show-current 2>/dev/null) || cur=
[ "$cur" = "dev" ] || { echo "not on dev (current: ${cur:-none})" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "working tree dirty" >&2; exit 1; }
git push -u origin dev || exit 1
pr_url=$(gh pr list --base main --head dev --state open --json url --jq '.[0].url' 2>/dev/null)
if [ -z "$pr_url" ] || [ "$pr_url" = "null" ]; then
  if [ -n "$BODY" ]; then
    pr_url=$(gh pr create --base main --head dev --title "$TITLE" --body "$BODY")
  else
    pr_url=$(gh pr create --base main --head dev --title "$TITLE")
  fi
fi
[ -n "$pr_url" ] || { echo "no PR URL" >&2; exit 1; }
printf '%s\n' "$pr_url"
if [ "$MERGE" -eq 1 ]; then
  gh pr merge "$pr_url" --merge || exit 1
  git fetch origin main || exit 1
  git checkout main || exit 1
  git merge --ff-only origin/main || exit 1
  git checkout dev || exit 1
  git merge --ff-only origin/main || exit 1
fi