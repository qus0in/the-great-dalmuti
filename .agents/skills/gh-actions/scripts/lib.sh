#!/bin/sh
# Shared helpers for gh-actions scripts. Source after setting HERE (scripts dir)
# and CACHE_FILE (latest-version cache): . "$HERE/lib.sh"
# Direct execution is a no-op (exit 0).
set -u

die() { rc=$1; shift; echo "$*" >&2; exit "$rc"; }
major_of() { printf '%s\n' "$1" | sed -E 's/^v?([0-9]+).*/\1/'; }
parse_uses() { # $1 = workflow file -> prints "linenum target@ref comment" lines
  awk '
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
  ' "$1"
}
get_latest() { # $1 = owner/repo -> prints "<repo> <tag> <major>"; needs $HERE + $CACHE_FILE
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
check_ref() { # $1=tag $2=file $3=lnum $4=target $5=ref [$6=comment] -> verdict or nothing; 0 ok, 1 stale
  tag=$1; f=$2; lnum=$3; target=$4; ref=$5; comment=${6:-}
  case "$target" in
    */*)
      p1=${target%%/*}; rem=${target#*/}; p2=${rem%%/*}
      owner_repo="$p1/$p2";;
    *) return 0;;
  esac
  latest_info=$(get_latest "$owner_repo") || {
    echo "$tag: failed to resolve latest version for $owner_repo ($f:$lnum)" >&2
    return 1
  }
  latest_tag=$(echo "$latest_info" | awk '{print $2}')
  latest_major_tag=$(echo "$latest_info" | awk '{print $3}')
  latest_major_num=$(major_of "$latest_major_tag")
  ref_major=""
  case "$ref" in
    [0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]*)
      if [ ${#ref} -ge 40 ]; then
        if [ -n "$comment" ]; then
          ref_major=$(major_of "$comment")
        fi
      else
        ref_major=$(major_of "$ref")
      fi;;
    *)
      ref_major=$(major_of "$ref");;
  esac
  if [ -z "$ref_major" ]; then
    echo "$f:$lnum: $target@$ref cannot determine major version (latest is $latest_major_tag)"
    return 1
  elif [ "$ref_major" -lt "$latest_major_num" ] 2>/dev/null; then
    echo "$f:$lnum: $target@$ref is below latest major $latest_major_tag ($latest_tag)"
    return 1
  fi
  return 0
}
:
