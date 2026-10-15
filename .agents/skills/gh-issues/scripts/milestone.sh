#!/bin/sh
# Usage: milestone.sh <title> "<description>" [--dry-run]
set -u
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd); cd "$ROOT" || exit 1
TITLE=""; DESC=""; DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1; shift;;
    *)
      if [ -z "$TITLE" ]; then TITLE=$1
      elif [ -z "$DESC" ]; then DESC=$1
      else echo "unexpected arg: $1" >&2; exit 2; fi
      shift;;
  esac
done
[ -n "$TITLE" ] || { echo "usage: $0 <title> <description> [--dry-run]" >&2; exit 2; }
origin=$(git remote get-url origin 2>/dev/null) || { echo "no origin" >&2; exit 1; }
slug=$(printf '%s\n' "$origin" | sed -E 's#^[a-z]+://[^/]+/##; s#^git@[^:]+:##; s#\.git$##')
owner=${slug%%/*}; repo=${slug#*/}
[ -n "$owner" ] && [ -n "$repo" ] && [ "$owner" != "$slug" ] || { echo "bad origin: $origin" >&2; exit 1; }
repo_api="repos/$owner/$repo"
if [ "$DRY" -eq 1 ]; then
  printf '+ gh api %s/milestones --jq '"'"'.[] | select(.title=="%s") | .number'"'"'\n' "$repo_api" "$TITLE"
  printf '+ if exists: gh api -X PATCH %s/milestones/N -f title=%s -f description=%s\n' "$repo_api" "$TITLE" "$DESC"
  printf '+ else: gh api -X POST %s/milestones -f title=%s -f description=%s\n' "$repo_api" "$TITLE" "$DESC"
  exit 0
fi
num=$(gh api "$repo_api/milestones" --jq ".[] | select(.title==\"$TITLE\") | .number" 2>/dev/null | head -n1)
if [ -n "$num" ]; then
  cur_desc=$(gh api "$repo_api/milestones/$num" --jq '.description' 2>/dev/null)
  if [ "$cur_desc" != "$DESC" ]; then
    gh api -X PATCH "$repo_api/milestones/$num" -f title="$TITLE" -f description="$DESC" >/dev/null || exit 1
  fi
else
  resp=$(gh api -X POST "$repo_api/milestones" -f title="$TITLE" -f description="$DESC" 2>/dev/null) || { echo "create failed" >&2; exit 1; }
  num=$(printf '%s\n' "$resp" | jq -r '.number')
fi
url=$(gh api "$repo_api/milestones/$num" --jq '.html_url' 2>/dev/null)
printf '%s %s\n' "$num" "$url"