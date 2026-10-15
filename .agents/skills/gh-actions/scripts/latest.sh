#!/bin/sh
# Usage: latest.sh <owner/repo>...
# Print "<owner/repo> <latest stable tag> <major tag>" from GitHub release or tags.
# Exit 0 ok, 2 usage, 1 lookup failure.
set -u

die() { rc=$1; shift; echo "latest.sh: $*" >&2; exit "$rc"; }
usage() { echo "usage: $0 <owner/repo>..." >&2; exit 2; }

[ $# -gt 0 ] || usage

command -v gh >/dev/null 2>&1 || die 1 "gh CLI not found in PATH"
command -v jq >/dev/null 2>&1 || die 1 "jq not found in PATH"

has_error=0

for repo in "$@"; do
  case "$repo" in
    */*) ;;
    *) echo "latest.sh: invalid repo format '$repo' (expected owner/repo)" >&2
       has_error=1
       continue
       ;;
  esac

  tag=""
  # Try GitHub releases/latest first
  rel_resp=$(gh api "repos/$repo/releases/latest" 2>/dev/null || true)
  if [ -n "$rel_resp" ]; then
    tag=$(printf '%s\n' "$rel_resp" | jq -r 'select(.draft == false and .prerelease == false) | .tag_name // empty' 2>/dev/null || true)
  fi

  # Fallback to tags if releases not available
  if [ -z "$tag" ]; then
    tags_resp=$(gh api "repos/$repo/tags" 2>/dev/null || true)
    if [ -n "$tags_resp" ]; then
      tag=$(printf '%s\n' "$tags_resp" | jq -r '
        if type != "array" then empty
        else
          [.[] | .name | select(test("^v?[0-9]+(\\.[0-9]+)*$"))]
          | map({raw: ., parts: (sub("^v"; "") | split(".") | map(tonumber))})
          | sort_by(.parts)
          | reverse
          | .[0].raw // empty
        end
      ' 2>/dev/null || true)
    fi
  fi

  if [ -z "$tag" ]; then
    echo "latest.sh: lookup failed for $repo (no stable release or tag found)" >&2
    has_error=1
    continue
  fi

  major_num=$(printf '%s\n' "$tag" | sed -E 's/^v?([0-9]+).*/\1/')
  if [ -z "$major_num" ]; then
    echo "latest.sh: could not determine major version from tag '$tag' for $repo" >&2
    has_error=1
    continue
  fi

  echo "$repo $tag v$major_num"
done

if [ "$has_error" -ne 0 ]; then
  exit 1
fi
exit 0
