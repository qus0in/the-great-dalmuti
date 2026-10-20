#!/bin/sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
FIX="$ROOT/tmp/snapshot-test-$$"; mkdir -p "$FIX/work"; trap 'rm -rf "$FIX"' EXIT
S="$HERE/snapshot.sh"
TASK="snapshot-test-$$"
A_REL="tmp/$TASK/work/a.txt"
B_REL="tmp/$TASK/work/b.txt"
printf 'one\n' > "$ROOT/$A_REL"
printf 'two\n' > "$ROOT/$B_REL"

# 1. create -> archive exists, gzip tar only
"$S" create "$TASK" u1 "$A_REL" "$B_REL" > /dev/null
ARC="$ROOT/tmp/$TASK/snapshot-u1.tar.gz"
[ -f "$ARC" ] || { echo "archive not created" >&2; exit 1; }
tar -tzf "$ARC" > "$FIX/list" || { echo "archive is not a gzip tar" >&2; exit 1; }
grep -Fq "$A_REL" "$FIX/list" || { echo "archive misses $A_REL" >&2; exit 1; }

# 2. verify -> same
out=$("$S" verify "$TASK" u1)
printf '%s\n' "$out" | grep -Fq "snapshot: same (2 files)" || { echo "verify should report same: $out" >&2; exit 1; }

# 3. existing archive -> refuse (exit 1)
rc=0; "$S" create "$TASK" u1 "$A_REL" > /dev/null 2>&1 || rc=$?
[ "$rc" -eq 1 ] || { echo "expected exit 1 on existing archive, got $rc" >&2; exit 1; }

# 4. changed file -> exit 1 + file list
printf 'changed\n' > "$ROOT/$A_REL"
rc=0; out=$("$S" verify "$TASK" u1 2>&1) || rc=$?
[ "$rc" -eq 1 ] || { echo "expected exit 1 on changed file, got $rc" >&2; exit 1; }
printf '%s\n' "$out" | grep -Fq "a.txt" || { echo "verify should list the changed file: $out" >&2; exit 1; }

# 5. restored file -> same again
printf 'one\n' > "$ROOT/$A_REL"
out=$("$S" verify "$TASK" u1)
printf '%s\n' "$out" | grep -Fq "snapshot: same (2 files)" || { echo "verify should report same again: $out" >&2; exit 1; }

# 6. missing file -> exit 2
rc=0; "$S" create "$TASK" u2 "tmp/$TASK/work/nope.txt" > /dev/null 2>&1 || rc=$?
[ "$rc" -eq 2 ] || { echo "expected exit 2 on missing file, got $rc" >&2; exit 1; }

echo "snapshot tests: ok"
