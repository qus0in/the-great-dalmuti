#!/bin/sh
# Usage: signals.sh [--since <git-rev|date>]
# Harvest candidate harness signals to stdout (deterministic, read-only):
#   1. blocking findings   tmp/*/review-*.md
#   2. failed gate logs    tmp/*/verify-*.log
#   3. repeated how-lines  briefs whose identical How step recurs >=2 (manual-step hint)
#   4. stale pointers      task-scratch paths referenced from durable surfaces
# Exit 0 always (findings are candidates, not failures); exit 2 usage error.
# Note: scans tmp/ by design; durable docs must not reference tmp/ paths.
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)

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
echo "== harness signals =="

section() { printf '\n%s\n' "$1"; }
hint() { printf '  - %s\n' "$1"; }

# 1. blocking findings from peer reviews
section "[review]"
if ls tmp/*/review-*.md >/dev/null 2>&1; then
  for f in tmp/*/review-*.md; do
    printf '  %s\n' "$f"
    awk '/^### *[Bb]locking/ { inb=1; next }
         /^#{2,3} /        { inb=0 }
         inb && NF         { printf "    - %s\n", $0 }' "$f" | head -20
  done
else
  hint "none"
fi

# 2. failed gate logs
section "[gate-failed]"
fail=0
if ls tmp/*/verify-*.log >/dev/null 2>&1; then
  for f in tmp/*/verify-*.log; do
    grep -qx "ok" "$f" 2>/dev/null && continue
    printf '%s: %s\n' "$f" "$(head -3 "$f" | tr '\n' ' ')"
    fail=1
  done
fi
[ "$fail" -eq 0 ] && hint "none"

# 3. repeated How steps across briefs (manual-step hint)
section "[repeated-step]"
rep=""
if ls tmp/*/brief-*.md >/dev/null 2>&1; then
  rep=$(for f in tmp/*/brief-*.md; do
          awk '/^# *[Hh]ow/{inh=1;next} /^#/{inh=0} inh && NF {print}' "$f"
        done | sed 's/^ *//; s/ *$//' | sort | uniq -c | sort -rn \
       | awk '$1>=2 && length($0)>40' | head -10)
fi
if [ -n "$rep" ]; then printf '%s\n' "$rep"; else hint "none"; fi

# 4. task-scratch pointers referenced from durable surfaces
# docs/prompt is verbatim history -> excluded, same as codify check.sh
section "[stale-scratch-pointer]"
pls=$(grep -rn -E 'tmp/[[:alnum:]][[:alnum:]/._-]*' \
        --exclude-dir=prompt AGENTS.md docs .agents/skills 2>/dev/null || true)
if [ -n "$pls" ]; then printf '%s\n' "$pls" | head -15; else hint "none"; fi

if [ -n "$SINCE" ]; then
  section "[since]"
  hint "$SINCE (informational; scans are not revision-filtered)"
fi

exit 0
