#!/bin/sh
# Usage: labels.sh [--dry-run]
set -u
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd); cd "$ROOT" || exit 1
DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1
CANONICAL_LABELS="focus:d73a4a instant:fbca04 tuck:c5def5 frontend:1d76db design:a2eeef"
origin=$(git remote get-url origin 2>/dev/null) || { echo "no origin" >&2; exit 1; }
slug=$(printf '%s\n' "$origin" | sed -E 's#^[a-z]+://[^/]+/##; s#^git@[^:]+:##; s#\.git$##')
owner=${slug%%/*}; repo=${slug#*/}
[ -n "$owner" ] && [ -n "$repo" ] && [ "$owner" != "$slug" ] || { echo "bad origin: $origin" >&2; exit 1; }
canonical_names=" focus instant tuck frontend design "
# existing labels
existing=$(gh label list --json name --jq '.[].name' 2>/dev/null)
# create missing
for entry in $CANONICAL_LABELS; do
  name=${entry%%:*}; color=${entry#*:}
  if printf '%s\n' "$existing" | grep -Fxq "$name"; then
    :
  else
    if [ "$DRY" -eq 1 ]; then
      printf '+ gh label create %s --repo %s/%s --color %s\n' "$name" "$owner" "$repo" "$color"
    else
      gh label create "$name" --repo "$owner/$repo" --color "$color" >/dev/null || exit 1
    fi
  fi
done
# delete extras
printf '%s\n' "$existing" | while IFS= read -r lbl; do
  [ -n "$lbl" ] || continue
  case "$canonical_names" in
    *" $lbl "*) ;;
    *)
      if [ "$DRY" -eq 1 ]; then
        printf '+ gh label delete %s --repo %s/%s --yes\n' "$lbl" "$owner" "$repo"
      else
        gh label delete "$lbl" --repo "$owner/$repo" --yes >/dev/null 2>&1 || true
      fi
      ;;
  esac
done