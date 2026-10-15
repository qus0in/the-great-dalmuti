#!/bin/sh
# Usage: wait.sh [--any] [--timeout MS] [--workspace ID --self-pane ID] <target>...
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
ANY=0; TIMEOUT=; TIMEOUT_SET=0
WS=; SELF=; WS_SET=0; SELF_SET=0
total=$#
i=0

while [ "$i" -lt "$total" ]; do
  arg=$1
  shift
  i=$((i + 1))
  case "$arg" in
    --any)
      ANY=1;;
    --timeout)
      [ "$i" -lt "$total" ] || { echo "usage: $0 [--any] [--timeout MS] [--workspace ID --self-pane ID] <target>..." >&2; exit 2; }
      TIMEOUT_SET=1; TIMEOUT=$1; shift; i=$((i + 1));;
    --workspace)
      [ "$i" -lt "$total" ] || { echo "usage: $0 [--any] [--timeout MS] [--workspace ID --self-pane ID] <target>..." >&2; exit 2; }
      WS_SET=1; WS=$1; shift; i=$((i + 1));;
    --self-pane)
      [ "$i" -lt "$total" ] || { echo "usage: $0 [--any] [--timeout MS] [--workspace ID --self-pane ID] <target>..." >&2; exit 2; }
      SELF_SET=1; SELF=$1; shift; i=$((i + 1));;
    --)
      while [ "$i" -lt "$total" ]; do
        set -- "$@" "$1"
        shift; i=$((i + 1))
      done
      break;;
    --*)
      echo "unknown option: $arg" >&2; exit 2;;
    *)
      set -- "$@" "$arg";;
  esac
done

if [ "$TIMEOUT_SET" -eq 1 ]; then
  case "$TIMEOUT" in ''|*[!0-9]*) echo "bad timeout: $TIMEOUT" >&2; exit 2;; esac
fi

[ $# -gt 0 ] || { echo "usage: $0 [--any] [--timeout MS] [--workspace ID --self-pane ID] <target>..." >&2; exit 2; }

# Validate context and scope all targets within workspace without unquoted expansion
build_and_run_context() {
  ws_val=$1; self_val=$2; ws_set=$3; self_set=$4; shift 4
  count=$#; k=0
  while [ "$k" -lt "$count" ]; do
    t=$1; shift
    set -- "$@" --target "$t"
    k=$((k + 1))
  done
  if [ "$ws_set" -eq 1 ] || [ "$self_set" -eq 1 ]; then
    [ "$ws_set" -eq 1 ] && set -- --workspace "$ws_val" "$@"
    [ "$self_set" -eq 1 ] && set -- --self-pane "$self_val" "$@"
  fi
  "$HERE/context.sh" "$@"
}

ctx=$(build_and_run_context "$WS" "$SELF" "$WS_SET" "$SELF_SET" "$@") || exit $?

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
joblist=""; j=0
for t in "$@"; do
  j=$((j+1))
  printf '%s\n' "$t" > "$TMPDIR/$j.target"
  if [ -n "$TIMEOUT" ]; then
    ( exec herdr agent wait "$t" --timeout "$TIMEOUT" >"$TMPDIR/$j.out" 2>&1 ) &
  else
    ( exec herdr agent wait "$t" >"$TMPDIR/$j.out" 2>&1 ) &
  fi
  joblist="$joblist $j:$!"
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