#!/bin/sh
# Usage: ship.sh "<title>" ["<body>"] [--body-file FILE] [--merge] [--dry-run]
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd); cd "$ROOT" || exit 1
TITLE=""; BODY=""; BODYFILE=""; MERGE=0; DRY=0
. "$HERE/ship-lib.sh"
ship_parse_args "$@"
cur=$(git branch --show-current 2>/dev/null) || cur=
[ "$cur" = "dev" ] || { echo "not on dev (current: ${cur:-none})" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "working tree dirty" >&2; exit 1; }
if [ "$MERGE" -eq 1 ]; then
  origin=$(git remote get-url origin) || { echo "cannot read origin" >&2; exit 1; }
  case "$origin" in
    https://github.com/*) repo=${origin#https://github.com/};;
    git@github.com:*) repo=${origin#git@github.com:};;
    ssh://git@github.com/*) repo=${origin#ssh://git@github.com/};;
    *) echo "unsupported GitHub origin" >&2; exit 1;;
  esac
  repo=${repo%.git}
  case "$repo" in */*) owner=${repo%%/*}; name=${repo#*/};;
    *) echo "invalid GitHub origin" >&2; exit 1;; esac
  [ -n "$owner" ] && [ -n "$name" ] || { echo "invalid GitHub origin" >&2; exit 1; }
  case "$owner$name" in *[!a-zA-Z0-9_.-]*) echo "invalid GitHub origin" >&2; exit 1;; esac
  flags=$(gh api "repos/$repo") || { echo "merge policy lookup failed" >&2; exit 1; }
  method=$(printf '%s' "$flags" | jq -er '
    if ([.allow_merge_commit, .allow_squash_merge, .allow_rebase_merge] | all(type == "boolean")) then
      if .allow_merge_commit then "--merge"
      elif .allow_squash_merge then "--squash"
      elif .allow_rebase_merge then "--rebase"
      else error("no allowed merge method") end
    else error("invalid merge policy") end
  ') || { echo "no valid allowed merge method" >&2; exit 1; }
fi
run_git push -u origin dev || exit 1
pr_url=$(gh pr list --base main --head dev --state open --json url --jq '.[0].url' 2>/dev/null) || { echo "pr lookup failed" >&2; exit 1; }
if [ -z "$pr_url" ] || [ "$pr_url" = "null" ]; then
  if [ -n "$BODY" ]; then
    set -- pr create --base main --head dev --title "$TITLE" --body "$BODY"
  else
    set -- pr create --base main --head dev --title "$TITLE"
  fi
  if [ "$DRY" -eq 1 ]; then
    run_gh "$@" || exit 1
    pr_url="(new-pr)"
  else
    pr_url=$(gh "$@") || exit 1
  fi
else
  if [ "$DRY" -eq 1 ]; then
    printf '# reuse %s\n' "$pr_url"
  fi
fi
[ -n "$pr_url" ] || { echo "no PR URL" >&2; exit 1; }
if [ "$DRY" -eq 0 ]; then
  printf '%s\n' "$pr_url"
fi
if [ "$MERGE" -eq 1 ]; then
  set -- pr merge "$pr_url" "$method"
  run_gh "$@" || exit 1
  run_git fetch origin main || exit 1
  run_git checkout main || exit 1
  run_git merge --ff-only origin/main || exit 1
  run_git checkout dev || exit 1
  if ! run_git merge --ff-only origin/main; then
    run_git merge --no-edit origin/main || exit 1
  fi
  if [ "$DRY" -eq 1 ]; then
    printf '# if dev cannot fast-forward: git merge --no-edit origin/main\n'
  fi
fi
