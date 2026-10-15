#!/bin/sh
# Usage: check.sh [workflow files...]
# Check that actions in workflow files are pinned to the latest major version.
# Default target: .github/workflows/*.yml and .github/workflows/*.yaml.
# Exit 0 with "ok" if all actions meet or exceed latest major, exit 1 if any stale, exit 2 on usage/missing file.
set -u

usage() { echo "usage: $0 [workflow files...]" >&2; exit 2; }

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)
. "$HERE/lib.sh"

FILES_TO_CHECK=""
for arg in "$@"; do
  case "$arg" in
    -*) usage;;
    *)
      [ -f "$arg" ] || die 2 "check.sh: file not found: '$arg'"
      FILES_TO_CHECK="${FILES_TO_CHECK:+$FILES_TO_CHECK
}$arg"
      ;;
  esac
done

if [ -z "$FILES_TO_CHECK" ]; then
  # Default discovery
  WF_DIR="$ROOT/.github/workflows"
  if [ -d "$WF_DIR" ]; then
    for wf in "$WF_DIR"/*.yml "$WF_DIR"/*.yaml; do
      [ -f "$wf" ] || continue
      FILES_TO_CHECK="${FILES_TO_CHECK:+$FILES_TO_CHECK
}$wf"
    done
  fi
fi

if [ -z "$FILES_TO_CHECK" ]; then
  echo "ok"
  exit 0
fi

CACHE_FILE=$(mktemp) || die 1 "mktemp failed"
trap 'rm -f "$CACHE_FILE"' EXIT INT TERM

stale_count=0

OLDIFS=$IFS; IFS='
'
for f in $FILES_TO_CHECK; do
  IFS=$OLDIFS
  [ -f "$f" ] || continue

  parsed=$(parse_uses "$f")

  [ -n "$parsed" ] || continue

  while IFS= read -r pline; do
    [ -n "$pline" ] || continue
    lnum=$(echo "$pline" | awk '{print $1}')
    target_ref=$(echo "$pline" | awk '{print $2}')
    comment=$(echo "$pline" | awk '{$1=""; $2=""; print $0}' | sed 's/^[[:space:]]*//')
    target=${target_ref%%@*}
    ref=${target_ref#*@}
    check_ref "check.sh" "$f" "$lnum" "$target" "$ref" "$comment" \
      || stale_count=$((stale_count + 1))
  done << EOF
$parsed
EOF
done
IFS=$OLDIFS

if [ "$stale_count" -gt 0 ]; then
  exit 1
fi

echo "ok"
exit 0
