#!/bin/sh
# Usage: snapshot.sh create <task> <unit> <files...>
#        snapshot.sh verify <task> <unit>
# create: packs the given repo-relative files into tmp/<task>/snapshot-<unit>.tar.gz
#         (gzip tar only). Existing archive -> refuse (exit 1). Missing file -> exit 2.
# verify: extracts the archive to a temp dir and `cmp`s every member against the
#         working tree. All same -> "snapshot: same (<n> files)" (exit 0);
#         different or missing -> "M <path>" lines + "snapshot: differ (...)" (exit 1).
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
usage() { echo "usage: $0 create <task> <unit> <files...> | verify <task> <unit>" >&2; exit 2; }
[ $# -ge 3 ] || usage
CMD=$1; TASK=$2; UNIT=$3; shift 3
case "$TASK" in ''|/*|*/*|.*) echo "snapshot.sh: invalid task: $TASK" >&2; exit 2;; esac
case "$UNIT" in ''|/*|*/*) echo "snapshot.sh: invalid unit: $UNIT" >&2; exit 2;; esac
TD="$ROOT/tmp/$TASK"
ARCHIVE="$TD/snapshot-$UNIT.tar.gz"

do_create() {
  [ $# -ge 1 ] || { echo "snapshot.sh: create needs at least one file" >&2; exit 2; }
  mkdir -p "$TD" || exit 2
  [ ! -e "$ARCHIVE" ] || { echo "snapshot.sh: refusing to overwrite: $ARCHIVE" >&2; exit 1; }
  n=0
  for f in "$@"; do
    case "$f" in
      -*) echo "snapshot.sh: bad file name: $f" >&2; exit 2;;
      /*) echo "snapshot.sh: file must be repo-relative: $f" >&2; exit 2;;
    esac
    [ -f "$ROOT/$f" ] || { echo "snapshot.sh: missing file: $f" >&2; exit 2; }
    n=$((n + 1))
  done
  (cd "$ROOT" && tar -czf "$ARCHIVE" "$@") || exit 1
  echo "snapshot: created $ARCHIVE ($n files)"
}

do_verify() {
  [ -f "$ARCHIVE" ] || { echo "snapshot.sh: no archive: $ARCHIVE" >&2; exit 2; }
  TMPD=$(mktemp -d) || exit 2
  trap 'rm -rf "$TMPD"' EXIT INT TERM
  tar -xzf "$ARCHIVE" -C "$TMPD" || exit 1
  tar -tzf "$ARCHIVE" | grep -v '/$' > "$TMPD/list" || true
  total=0; bad=0
  while IFS= read -r m; do
    [ -n "$m" ] || continue
    total=$((total + 1))
    if [ ! -f "$ROOT/$m" ] || ! cmp -s "$TMPD/$m" "$ROOT/$m"; then
      echo "M $m"
      bad=$((bad + 1))
    fi
  done < "$TMPD/list"
  if [ "$bad" -gt 0 ]; then
    echo "snapshot: differ ($bad of $total files)"
    exit 1
  fi
  echo "snapshot: same ($total files)"
}

case "$CMD" in
  create) do_create "$@";;
  verify) do_verify;;
  *) usage;;
esac
