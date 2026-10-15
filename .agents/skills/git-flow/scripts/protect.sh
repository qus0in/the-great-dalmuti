#!/bin/sh
# Usage: protect.sh [--dry-run]
set -u
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd); cd "$ROOT" || exit 1
DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1
origin=$(git remote get-url origin 2>/dev/null) || { echo "no origin" >&2; exit 1; }
slug=$(printf '%s\n' "$origin" | sed -E 's#^[a-z]+://[^/]+/##; s#^git@[^:]+:##; s#\.git$##')
owner=${slug%%/*}; repo=${slug#*/}
[ -n "$owner" ] && [ -n "$repo" ] && [ "$owner" != "$slug" ] || { echo "bad origin: $origin" >&2; exit 1; }
if [ "$DRY" -eq 1 ]; then
  printf '+ gh api -X PUT repos/%s/%s/branches/main/protection --input - <<JSON\n' "$owner" "$repo"
  cat <<'JSON'
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0, "dismiss_stale_reviews": false },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
  exit 0
fi
err=$(gh api -X PUT "repos/$owner/$repo/branches/main/protection" --input - 2>&1 >/dev/null <<'JSON')
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0, "dismiss_stale_reviews": false },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
if [ $? -ne 0 ]; then
  printf '%s\n' "$err" >&2
  if printf '%s\n' "$err" | grep -q '422'; then
    echo "hint: retry with required_approving_review_count: 1 (classic branch protection may require >=1)" >&2
  fi
  exit 1
fi