#!/bin/sh
# Usage: wait.sh [--any] [--timeout MS] [--workspace ID --self-pane ID] <target>...
# Exit 0 when all targets settled (idle/done); 1 otherwise; 2 usage error.
# Settlement requires an observed working state after WAIT_SINCE (dispatch epoch
# secs from dispatch.sh; 0 = untracked). With no working transition within
# WAIT_GRACE_MS (default 30000) of WAIT_SINCE, a target reports "never-started".
#
# Working detection uses `herdr agent wait --until working` (B1 fix): herdr blocks
# until the event fires or the grace expires, so there is no blind polling.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
. "$HERE/wait-lib.sh"
ANY=0; TIMEOUT=600000; TIMEOUT_SET=0
WS=; SELF=; WS_SET=0; SELF_SET=0
USAGE="usage: $0 [--any] [--timeout MS] [--workspace ID --self-pane ID] <target>..."

total=$#; i=0
while [ "$i" -lt "$total" ]; do
  arg=$1; shift; i=$((i + 1))
  case "$arg" in
    --any) ANY=1;;
    --timeout|--workspace|--self-pane)
      [ "$i" -lt "$total" ] || { echo "$USAGE" >&2; exit 2; }
      case "$arg" in
        --timeout) TIMEOUT_SET=1; TIMEOUT=$1;;
        --workspace) WS_SET=1; WS=$1;;
        --self-pane) SELF_SET=1; SELF=$1;;
      esac
      shift; i=$((i + 1));;
    --)
      while [ "$i" -lt "$total" ]; do set -- "$@" "$1"; shift; i=$((i + 1)); done
      break;;
    --*) echo "unknown option: $arg" >&2; exit 2;;
    *) set -- "$@" "$arg";;
  esac
done

[ "$TIMEOUT_SET" -eq 0 ] || case "$TIMEOUT" in ''|*[!0-9]*) echo "bad timeout: $TIMEOUT" >&2; exit 2;; esac
case "$WAIT_GRACE_MS" in ''|*[!0-9]*) echo "bad WAIT_GRACE_MS" >&2; exit 2;; esac
case "$WAIT_SINCE" in ''|*[!0-9]*) echo "bad WAIT_SINCE" >&2; exit 2;; esac

[ $# -gt 0 ] || { echo "$USAGE" >&2; exit 2; }
$(build_and_run_context "$WS" "$SELF" "$WS_SET" "$SELF_SET" "$@" >/dev/null) || exit $?

FAIL=0
wait_one() { # <target> -> prints "<target> <status>"; returns 1 when not settled
  t=$1
  # Gate 1: working must be observed (dispatch -> work), else never-started.
  if [ "$WAIT_SINCE" -gt 0 ] && ! working_wait "$t" "$WAIT_GRACE_MS"; then
    printf '%s never-started\n' "$t"; return 1
  fi
  # Gate 2: block until the run settles (idle/done/blocked) or timeout.
  if settle_wait "$t" "$TIMEOUT"; then
    printf '%s %s\n' "$t" "$(agent_status "$t")"
  else
    printf '%s %s\n' "$t" "$(agent_status "$t")"
    return 1
  fi
  return 0
}

if [ "$ANY" -eq 0 ]; then
  for t in "$@"; do wait_one "$t" || FAIL=1; done
  exit "$FAIL"
fi

TMPDIR=$(mktemp -d) || { echo "mktemp failed" >&2; exit 1; }
trap 'rm -rf "$TMPDIR"' EXIT INT TERM
joblist=""; j=0
for t in "$@"; do
  j=$((j + 1)); printf '%s\n' "$t" > "$TMPDIR/$j.target"
  ( wait_one "$t" >"$TMPDIR/$j.out" 2>&1; echo $? >"$TMPDIR/$j.rc" ) &
  joblist="$joblist $j:$!"
done

while :; do
  hit=0
  for entry in $joblist; do
    idx=${entry%%:*}
    [ -f "$TMPDIR/$idx.rc" ] || continue
    cat "$TMPDIR/$idx.out"
    [ "$(cat "$TMPDIR/$idx.rc")" = 0 ] || FAIL=1
    hit=$idx; break
  done
  [ "$hit" = 0 ] || break
  sleep 0.2
done

for entry in $joblist; do
  p=${entry#*:}; kill "$p" 2>/dev/null || true; wait "$p" 2>/dev/null || true
done
exit "$FAIL"
