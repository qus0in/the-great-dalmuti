#!/bin/sh
# Usage: issue.sh "<title>" <milestone> <label>[,<label>...] ["<body>"] [--dry-run]
set -u
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd); cd "$ROOT" || exit 1
TITLE=""; MILESTONE=""; LABELS=""; BODY=""; DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1; shift;;
    --) shift; break;;
    *)
      if [ -z "$TITLE" ]; then TITLE=$1
      elif [ -z "$MILESTONE" ]; then MILESTONE=$1
      elif [ -z "$LABELS" ]; then LABELS=$1
      elif [ -z "$BODY" ]; then BODY=$1
      else echo "unexpected arg: $1" >&2; exit 2; fi
      shift;;
  esac
done
[ -n "$TITLE" ] && [ -n "$MILESTONE" ] && [ -n "$LABELS" ] || { echo "usage: $0 <title> <milestone> <labels> [body] [--dry-run]" >&2; exit 2; }
origin=$(git remote get-url origin 2>/dev/null) || { echo "no origin" >&2; exit 1; }
slug=$(printf '%s\n' "$origin" | sed -E 's#^[a-z]+://[^/]+/##; s#^git@[^:]+:##; s#\.git$##')
owner=${slug%%/*}; repo=${slug#*/}
canonical_names=" focus instant tuck frontend design "
# validate labels
OLDIFS=$IFS; IFS=,
for l in $LABELS; do
  IFS=$OLDIFS
  [ -n "$l" ] || continue
  case "$canonical_names" in
    *" $l "*) ;;
    *) echo "invalid label: $l" >&2; exit 1;;
  esac
done
IFS=$OLDIFS
# validate milestone exists (read-only)
ms_list=$(gh api "repos/$owner/$repo/milestones" --jq '.[].title' 2>/dev/null)
printf '%s\n' "$ms_list" | grep -Fxq "$MILESTONE" || { echo "milestone not found: $MILESTONE" >&2; exit 1; }
if [ "$DRY" -eq 1 ]; then
  printf '+ gh issue create --title %s --milestone %s --label %s%s\n' "$TITLE" "$MILESTONE" "$LABELS" "${BODY:+ --body ...}"
  exit 0
fi
set -- gh issue create --title "$TITLE" --milestone "$MILESTONE"
OLDIFS=$IFS; IFS=,
for l in $LABELS; do
  IFS=$OLDIFS
  [ -n "$l" ] || continue
  set -- "$@" --label "$l"
done
IFS=$OLDIFS
[ -n "$BODY" ] && set -- "$@" --body "$BODY"
"$@"