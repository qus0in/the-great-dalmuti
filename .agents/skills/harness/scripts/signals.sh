#!/bin/sh
# Usage: signals.sh [--since <git-rev|date>]
# Harvest candidate harness signals to stdout (deterministic, read-only):
#   1. blocking findings    tmp/*/review-*.md
#   2. failed gate logs     tmp/*/verify-*.log
#   3. triage events        tmp/*/triage.log
#   4. blocked callbacks    status=blocked|failed in tmp/*/callbacks.log, state.md
#   5. BLOCK verdicts       VERDICT lines in tmp/*/review-*.md
#   6. repeated how-lines   briefs whose identical How step recurs >=2 (manual-step hint)
#   7. stale pointers       task-scratch paths referenced from durable surfaces
# --since <git-rev|date> prints only files whose mtime (or rev commit time) is >= SINCE.
# Exit 0 always (findings are candidates, not failures); exit 2 usage error.
# Note: scans tmp/ by design; durable docs must not reference tmp/ paths.
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)
. "$HERE/signals-lib.sh"

SINCE=""

usage() { echo "usage: $0 [--since <git-rev|date>]" >&2; exit 2; }

while [ $# -gt 0 ]; do
  case "$1" in
    --since) [ $# -ge 2 ] || usage; SINCE=$2; shift 2 ;;
    --since=*) SINCE=${1#--since=}; shift ;;
    -h|--help) usage ;;
    *) usage ;;
  esac
done

cd "$ROOT"

# Helpers (collectors live in signals-lib.sh).
section() { printf '\n%s\n' "$1"; }
hint() { printf '  - %s\n' "$1"; }
emit() { if [ -s "$CAPT" ]; then sed -n '1,20p' "$CAPT"; else hint "none"; fi; }

# --since epoch: git rev -> commit time; else date (BSD first, GNU fallback); 0 = no filter.
# BSD date fills unspecified units with the current time, so parse with explicit zero time.
since_epoch() {
  s=$1
  if [ -z "$s" ]; then echo 0; return 0; fi
  c=$(git rev-parse --verify --quiet "${s}^{commit}" 2>/dev/null || true)
  if [ -n "$c" ]; then echo "$(git log -1 --format=%ct "$c")"; return 0; fi
  d=$(date -j -u -f '%Y-%m-%dT%H:%M:%S' "$s" '+%s' 2>/dev/null || true)
  if [ -z "$d" ]; then d=$(date -j -u -f '%Y-%m-%d %H:%M:%S' "$s 00:00:00" '+%s' 2>/dev/null || true); fi
  if [ -z "$d" ]; then d=$(date -u -d "$s" '+%s' 2>/dev/null || true); fi
  if [ -n "$d" ]; then echo "$d"; return 0; fi
  echo "ERR"; return 0
}

# File passed the mtime filter? (files with unknown mtime are included)
is_new() {
  [ "$SINCE_EPOCH" -gt 0 ] || return 0
  m=$(stat -f %m "$1" 2>/dev/null || true)
  if [ -z "$m" ]; then m=$(stat -c %Y "$1" 2>/dev/null || true); fi
  if [ -z "$m" ]; then return 0; fi
  [ "$m" -ge "$SINCE_EPOCH" ]
}

if [ -n "$SINCE" ]; then
  SINCE_EPOCH=$(since_epoch "$SINCE")
  if [ "$SINCE_EPOCH" = "ERR" ]; then usage; fi
else
  SINCE_EPOCH=0
fi

CAPT=$(mktemp) || exit 1
trap 'rm -f "$CAPT"' EXIT INT TERM

echo "== harness signals =="
if [ "$SINCE_EPOCH" -gt 0 ]; then
  hint "signal window: files with mtime >= $SINCE (epoch $SINCE_EPOCH)"
fi

collect_review
collect_gate
collect_triage
collect_cb
collect_verdict
collect_repeated
collect_ptr

exit 0
