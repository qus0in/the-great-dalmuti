#!/bin/sh
# Usage: milestone.sh <title> "<description>" [--dry-run]
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd); cd "$ROOT" || exit 1
. "$HERE/quote.sh"

TITLE=""; DESC=""; DESC_SET=0; DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY=1; shift;;
    --)
      shift
      while [ $# -gt 0 ]; do
        if [ -z "$TITLE" ]; then TITLE=$1
        elif [ "$DESC_SET" -eq 0 ]; then DESC=$1; DESC_SET=1
        else echo "unexpected arg: $1" >&2; exit 2; fi
        shift
      done
      break;;
    --*)
      echo "unknown option: $1" >&2; exit 2;;
    *)
      if [ -z "$TITLE" ]; then TITLE=$1
      elif [ "$DESC_SET" -eq 0 ]; then DESC=$1; DESC_SET=1
      else echo "unexpected arg: $1" >&2; exit 2; fi
      shift;;
  esac
done
[ -n "$TITLE" ] && [ "$DESC_SET" -eq 1 ] || { echo "usage: $0 <title> <description> [--dry-run]" >&2; exit 2; }

origin=$(git remote get-url origin 2>/dev/null) || { echo "no origin" >&2; exit 1; }
slug=$(printf '%s\n' "$origin" | sed -E 's#^[a-z]+://[^/]+/##; s#^git@[^:]+:##; s#\.git$##')
owner=${slug%%/*}; repo=${slug#*/}
[ -n "$owner" ] && [ -n "$repo" ] && [ "$owner" != "$slug" ] || { echo "bad origin: $origin" >&2; exit 1; }
repo_api="repos/$owner/$repo"

# Fetch all pages with --paginate --slurp and state=all; propagate API failure
list_resp=$(gh api --paginate --slurp "$repo_api/milestones?state=all&per_page=100" 2>&1) || { echo "milestone lookup failed: $list_resp" >&2; exit 1; }

# Validate actual paginated JSON structure and required types of every milestone entry
items=$(printf '%s\n' "$list_resp" | jq -e '
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

# Select milestone using --arg; check selection return code so malformed lookup never falls through to POST
match_json=$(printf '%s\n' "$items" | jq -c --arg t "$TITLE" '
  [.[] | select(.title == $t)][0] // null
') || { echo "milestone selection failed" >&2; exit 1; }

if [ "$match_json" != "null" ] && [ -n "$match_json" ]; then
  num=$(printf '%s\n' "$match_json" | jq -r '.number')
  cur_desc=$(printf '%s\n' "$match_json" | jq -r '.description // ""')
  url=$(printf '%s\n' "$match_json" | jq -r '.html_url')
else
  num=""; cur_desc=""; url=""
fi

# Existing matching milestone is a no-op (no PATCH)
if [ -n "$num" ] && [ "$cur_desc" = "$DESC" ]; then
  if [ "$DRY" -eq 1 ]; then
    exit 0
  fi
  printf '%s %s\n' "$num" "$url"
  exit 0
fi

# Build mutation command argv once
if [ -n "$num" ]; then
  set -- gh api -X PATCH "$repo_api/milestones/$num" -f "title=$TITLE" -f "description=$DESC"
  action="update"
else
  set -- gh api -X POST "$repo_api/milestones" -f "title=$TITLE" -f "description=$DESC"
  action="create"
fi

if [ "$DRY" -eq 1 ]; then
  print_cmd "$@"
  exit 0
fi

resp=$("$@" 2>&1) || { echo "milestone $action failed: $resp" >&2; exit 1; }

# Strictly validate response: positive integer number and non-empty URL string
printf '%s\n' "$resp" | jq -e '
  type == "object" and . != null
  and (.number | type == "number" and . > 0 and (. | floor) == .)
  and (.html_url | type == "string" and . != "")
' >/dev/null 2>&1 || { echo "milestone $action returned malformed response: $resp" >&2; exit 1; }

num=$(printf '%s\n' "$resp" | jq -r '.number')
url=$(printf '%s\n' "$resp" | jq -r '.html_url')
printf '%s %s\n' "$num" "$url"