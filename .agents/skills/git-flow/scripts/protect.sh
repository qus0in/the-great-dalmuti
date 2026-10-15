#!/bin/sh
# Usage: protect.sh [--dry-run]
set -u
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd); cd "$ROOT" || exit 1
DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1; shift;;
    --) shift; break;;
    -*) echo "unknown option: $1" >&2; exit 2;;
    *) echo "unexpected arg: $1" >&2; exit 2;;
  esac
done
[ $# -eq 0 ] || { echo "unexpected arg: $1" >&2; exit 2; }
origin=$(git remote get-url origin 2>/dev/null) || { echo "no origin" >&2; exit 1; }
slug=$(printf '%s\n' "$origin" | sed -E 's#^[a-z]+://[^/]+/##; s#^git@[^:]+:##; s#\.git$##')
owner=${slug%%/*}; repo=${slug#*/}
[ -n "$owner" ] && [ -n "$repo" ] && [ "$owner" != "$slug" ] || { echo "bad origin: $origin" >&2; exit 1; }
PAYLOAD=$(cat <<'JSON'
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0, "dismiss_stale_reviews": false },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
)
if [ "$DRY" -eq 1 ]; then
  printf '+ gh api -X PUT repos/%s/%s/branches/main/protection --input - <<JSON\n' "$owner" "$repo"
  printf '%s\n' "$PAYLOAD"
  exit 0
fi
err=$(printf '%s\n' "$PAYLOAD" | gh api -X PUT "repos/$owner/$repo/branches/main/protection" --input - 2>&1 >/dev/null)
rc=$?
if [ "$rc" -ne 0 ]; then
  printf '%s\n' "$err" >&2
  exit 1
fi