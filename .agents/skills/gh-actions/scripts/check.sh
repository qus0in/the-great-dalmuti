#!/bin/sh
# Usage: check.sh [workflow files...]
# Check that actions in workflow files are pinned to the latest major version.
# Default target: .github/workflows/*.yml and .github/workflows/*.yaml.
# Exit 0 with "ok" if all actions meet or exceed latest major, exit 1 if any stale, exit 2 on usage/missing file.
set -u

die() { rc=$1; shift; echo "check.sh: $*" >&2; exit "$rc"; }
usage() { echo "usage: $0 [workflow files...]" >&2; exit 2; }

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)

FILES_TO_CHECK=""
for arg in "$@"; do
  case "$arg" in
    -*) usage;;
    *)
      [ -f "$arg" ] || die 2 "file not found: '$arg'"
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

get_latest() {
  repo=$1
  cached=$(grep -E "^$repo[[:space:]]" "$CACHE_FILE" 2>/dev/null | head -n 1 || true)
  if [ -n "$cached" ]; then
    echo "$cached"
    return 0
  fi
  out=$("$HERE/latest.sh" "$repo" 2>/dev/null) || return 1
  echo "$out" >> "$CACHE_FILE"
  echo "$out"
}

stale_count=0

OLDIFS=$IFS; IFS='
'
for f in $FILES_TO_CHECK; do
  IFS=$OLDIFS
  [ -f "$f" ] || continue

  # Parse uses lines with awk: line_num, target@ref, comment
  parsed=$(awk '
    /^[[:space:]]*(-[[:space:]]+)?uses:[[:space:]]*/ {
      line = $0
      sub(/^[[:space:]]*(-[[:space:]]+)?uses:[[:space:]]*/, "", line)
      comment = ""
      if (match(line, /#[[:space:]]*/)) {
        comment = substr(line, RSTART + RLENGTH)
        line = substr(line, 1, RSTART - 1)
      }
      gsub(/[[:space:]\x27\"]/, "", line)
      gsub(/[[:space:]\x27\"]/, "", comment)
      if (line ~ /^\.\// || line ~ /^docker:\/\//) next
      if (line ~ /@/) {
        print NR, line, comment
      }
    }
  ' "$f")

  [ -n "$parsed" ] || continue

  while IFS= read -r pline; do
    [ -n "$pline" ] || continue
    lnum=$(echo "$pline" | awk '{print $1}')
    target_ref=$(echo "$pline" | awk '{print $2}')
    comment=$(echo "$pline" | awk '{$1=""; $2=""; print $0}' | sed 's/^[[:space:]]*//')

    target=${target_ref%%@*}
    ref=${target_ref#*@}

    case "$target" in
      */*)
        p1=${target%%/*}
        rem=${target#*/}
        p2=${rem%%/*}
        owner_repo="$p1/$p2"
        ;;
      *) continue;;
    esac

    latest_info=$(get_latest "$owner_repo") || {
      echo "check.sh: failed to resolve latest version for $owner_repo ($f:$lnum)" >&2
      stale_count=$((stale_count + 1))
      continue
    }

    latest_tag=$(echo "$latest_info" | awk '{print $2}')
    latest_major_tag=$(echo "$latest_info" | awk '{print $3}')
    latest_major_num=$(printf '%s\n' "$latest_major_tag" | sed -E 's/^v?([0-9]+).*/\1/')

    # Determine ref major
    ref_major=""
    case "$ref" in
      [0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]*)
        if [ ${#ref} -ge 40 ]; then
          # SHA pin: check comment
          if [ -n "$comment" ]; then
            ref_major=$(printf '%s\n' "$comment" | sed -E 's/^v?([0-9]+).*/\1/')
          fi
        else
          ref_major=$(printf '%s\n' "$ref" | sed -E 's/^v?([0-9]+).*/\1/')
        fi
        ;;
      *)
        ref_major=$(printf '%s\n' "$ref" | sed -E 's/^v?([0-9]+).*/\1/')
        ;;
    esac

    if [ -z "$ref_major" ]; then
      echo "$f:$lnum: $target@$ref cannot determine major version (latest is $latest_major_tag)"
      stale_count=$((stale_count + 1))
    elif [ "$ref_major" -lt "$latest_major_num" ] 2>/dev/null; then
      echo "$f:$lnum: $target@$ref is below latest major $latest_major_tag ($latest_tag)"
      stale_count=$((stale_count + 1))
    fi
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
