#!/bin/sh
# Usage: issue.sh "<title>" <milestone> <label>[,<label>...] ["<body>"] [--dry-run]
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd); cd "$ROOT" || exit 1
. "$HERE/quote.sh"

TITLE=""; MILESTONE=""; LABELS=""; BODY=""; BODY_SET=0; DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY=1; shift;;
    --)
      shift
      while [ $# -gt 0 ]; do
        if [ -z "$TITLE" ]; then TITLE=$1
        elif [ -z "$MILESTONE" ]; then MILESTONE=$1
        elif [ -z "$LABELS" ]; then LABELS=$1
        elif [ "$BODY_SET" -eq 0 ]; then BODY=$1; BODY_SET=1
        else echo "unexpected arg: $1" >&2; exit 2; fi
        shift
      done
      break;;
    --*)
      echo "unknown option: $1" >&2; exit 2;;
    *)
      if [ -z "$TITLE" ]; then TITLE=$1
      elif [ -z "$MILESTONE" ]; then MILESTONE=$1
      elif [ -z "$LABELS" ]; then LABELS=$1
      elif [ "$BODY_SET" -eq 0 ]; then BODY=$1; BODY_SET=1
      else echo "unexpected arg: $1" >&2; exit 2; fi
      shift;;
  esac
done
[ -n "$TITLE" ] && [ -n "$MILESTONE" ] && [ -n "$LABELS" ] || { echo "usage: $0 <title> <milestone> <labels> [body] [--dry-run]" >&2; exit 2; }

origin=$(git remote get-url origin 2>/dev/null) || { echo "no origin" >&2; exit 1; }
slug=$(printf '%s\n' "$origin" | sed -E 's#^[a-z]+://[^/]+/##; s#^git@[^:]+:##; s#\.git$##')
owner=${slug%%/*}; repo=${slug#*/}
[ -n "$owner" ] && [ -n "$repo" ] && [ "$owner" != "$slug" ] || { echo "bad origin: $origin" >&2; exit 1; }
repo_api="repos/$owner/$repo"

canonical_names=" focus instant tuck frontend design "
# Validate labels
label_count=0
OLDIFS=$IFS; IFS=,
for l in $LABELS; do
  IFS=$OLDIFS
  [ -n "$l" ] || continue
  case "$canonical_names" in
    *" $l "*) label_count=$((label_count + 1));;
    *) echo "invalid label: $l" >&2; exit 1;;
  esac
done
IFS=$OLDIFS
[ "$label_count" -ge 1 ] || { echo "at least one valid label required" >&2; exit 1; }

# Validate milestone exists across all paginated pages (read-only with state=all and pagination; propagate errors)
ms_resp=$(gh api --paginate --slurp "$repo_api/milestones?state=all&per_page=100" 2>&1) || { echo "milestone lookup failed: $ms_resp" >&2; exit 1; }

# Validate actual paginated structure and entry types
ms_items=$(printf '%s\n' "$ms_resp" | jq -e '
  if type != "array" then error("root must be array")
  elif all(.[]; type == "array") then [.[][]]
  elif all(.[]; type == "object") then .
  elif length == 0 then []
  else error("malformed outer array")
  end
  | if all(.[]; type == "object" and . != null and (.number | type == "number" and . > 0 and (. | floor) == .) and (.title | type == "string" and . != "") and (.html_url | type == "string" and . != "") and ((.description | type == "string") or .description == null))
    then .
    else error("malformed milestone entry")
    end
' 2>/dev/null) || { echo "milestone lookup returned malformed response" >&2; exit 1; }

printf '%s\n' "$ms_items" | jq -e --arg m "$MILESTONE" '
  any(.[]; .title == $m)
' >/dev/null 2>&1 || { echo "milestone not found: $MILESTONE" >&2; exit 1; }

# Build actual mutation argv once
set -- gh issue create --title "$TITLE" --milestone "$MILESTONE"
OLDIFS=$IFS; IFS=,
for l in $LABELS; do
  IFS=$OLDIFS
  [ -n "$l" ] || continue
  set -- "$@" --label "$l"
done
IFS=$OLDIFS
[ -n "$BODY" ] && set -- "$@" --body "$BODY"

if [ "$DRY" -eq 1 ]; then
  print_cmd "$@"
  exit 0
fi

"$@"