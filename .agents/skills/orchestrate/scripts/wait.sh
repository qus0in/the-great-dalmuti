#!/bin/sh
# Usage: wait.sh [--any] [--timeout MS] <target>...
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
ANY=0; TIMEOUT=
while [ $# -gt 0 ]; do
  case "$1" in
    --any) ANY=1; shift;;
    --timeout)
      [ $# -ge 2 ] || { echo "usage: $0 [--any] [--timeout MS] <target>..." >&2; exit 2; }
      TIMEOUT=$2; shift 2;;
    --) shift; break;;
    *) break;;
  esac
done
[ $# -ge 1 ] || { echo "usage: $0 [--any] [--timeout MS] <target>..." >&2; exit 2; }
FAIL=0
if [ "$ANY" -eq 0 ]; then
  for t in "$@"; do
    if [ -n "$TIMEOUT" ]; then
      out=$(herdr agent wait "$t" --timeout "$TIMEOUT" 2>&1); rc=$?
    else
      out=$(herdr agent wait "$t" 2>&1); rc=$?
    fi
    st=$(printf '%s\n' "$out" | jq -r '.result.agent.agent_status // empty' 2>/dev/null || true)
    [ -n "$st" ] || st=unknown
    printf '%s %s\n' "$t" "$st"
    if [ "$rc" -ne 0 ] || { [ "$st" != "idle" ] && [ "$st" != "done" ]; }; then FAIL=1; fi
  done
  exit "$FAIL"
fi
TMPDIR=$(mktemp -d) || { echo "mktemp failed" >&2; exit 1; }
trap 'rm -rf "$TMPDIR"' EXIT INT TERM
joblist=""; i=0
for t in "$@"; do
  i=$((i+1))
  printf '%s\n' "$t" > "$TMPDIR/$i.target"
  if [ -n "$TIMEOUT" ]; then
    ( exec herdr agent wait "$t" --timeout "$TIMEOUT" >"$TMPDIR/$i.out" 2>&1 ) &
  else
    ( exec herdr agent wait "$t" >"$TMPDIR/$i.out" 2>&1 ) &
  fi
  joblist="$joblist $i:$!"
done
doneflag=0
while [ "$doneflag" -eq 0 ]; do
  for entry in $joblist; do
    idx=${entry%%:*}; pid=${entry#*:}
    kill -0 "$pid" 2>/dev/null && continue
    t=$(cat "$TMPDIR/$idx.target")
    out=$(cat "$TMPDIR/$idx.out" 2>/dev/null || true)
    st=$(printf '%s\n' "$out" | jq -r '.result.agent.agent_status // empty' 2>/dev/null || true)
    [ -n "$st" ] || st=unknown
    rc=0; wait "$pid" >/dev/null 2>&1 || rc=$?
    printf '%s %s\n' "$t" "$st"
    for e2 in $joblist; do
      p2=${e2#*:}
      [ "$p2" = "$pid" ] && continue
      kill "$p2" 2>/dev/null || true
      wait "$p2" 2>/dev/null || true
    done
    if [ "$rc" -ne 0 ] || { [ "$st" != "idle" ] && [ "$st" != "done" ]; }; then FAIL=1; fi
    doneflag=1
    break
  done
  [ "$doneflag" -eq 0 ] && sleep 0.2
done
exit "$FAIL"