#!/bin/sh
# Usage: labels.sh [--dry-run]
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd); cd "$ROOT" || exit 1
. "$HERE/quote.sh"

DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY=1; shift;;
    --)
      shift
      while [ $# -gt 0 ]; do
        echo "unexpected arg: $1" >&2; exit 2
      done
      break;;
    --*)
      echo "unknown option: $1" >&2; exit 2;;
    *)
      echo "unexpected arg: $1" >&2; exit 2;;
  esac
done
[ $# -eq 0 ] || { echo "usage: $0 [--dry-run]" >&2; exit 2; }

CANONICAL_LABELS="focus:d73a4a instant:fbca04 tuck:c5def5 frontend:1d76db design:a2eeef"
origin=$(git remote get-url origin 2>/dev/null) || { echo "no origin" >&2; exit 1; }
slug=$(printf '%s\n' "$origin" | sed -E 's#^[a-z]+://[^/]+/##; s#^git@[^:]+:##; s#\.git$##')
owner=${slug%%/*}; repo=${slug#*/}
[ -n "$owner" ] && [ -n "$repo" ] && [ "$owner" != "$slug" ] || { echo "bad origin: $origin" >&2; exit 1; }

# Read existing labels; read-only list failure must fail without modifying labels
existing_json=$(gh label list --repo "$owner/$repo" --limit 500 --json name 2>&1) || { echo "failed listing labels: $existing_json" >&2; exit 1; }

# Validate that response is a JSON array and every entry has a non-empty string name
# [null], [1], [{}], name array/object/missing must fail; valid [] succeeds
existing=$(printf '%s\n' "$existing_json" | jq -r '
  if type != "array" then error("root must be array")
  elif all(.[]; type == "object" and . != null and (.name | type == "string" and . != ""))
  then .[].name
  else error("malformed label entry: every entry must be an object with non-empty string name")
  end
') || { echo "malformed label list response" >&2; exit 1; }

# Create missing canonical labels
for entry in $CANONICAL_LABELS; do
  name=${entry%%:*}; color=${entry#*:}
  if printf '%s\n' "$existing" | grep -Fxq "$name"; then
    :
  else
    set -- gh label create "$name" --repo "$owner/$repo" --color "$color"
    run_or_dry "$@" || exit $?
  fi
done

# Delete extra non-canonical labels
# Disable pathname expansion (globbing) so arbitrary label names like "*" are preserved literally and never expanded to local files
extras=$(printf '%s\n' "$existing_json" | jq -r '
  .[].name
  | select(. != "focus" and . != "instant" and . != "tuck" and . != "frontend" and . != "design")
')
set -f
OLDIFS=$IFS; IFS='
'
for lbl in $extras; do
  IFS=$OLDIFS
  [ -n "$lbl" ] || continue
  set -- gh label delete "$lbl" --repo "$owner/$repo" --yes
  run_or_dry "$@" || { rc=$?; set +f; exit "$rc"; }
done
IFS=$OLDIFS
set +f