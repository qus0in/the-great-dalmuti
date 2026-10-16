#!/bin/sh
# Usage: elapsed.sh <epoch | dispatch.log | file>
# Prints elapsed seconds and minutes since dispatch.
set -eu
[ $# -ge 1 ] || { echo "usage: $0 <epoch | log-file>" >&2; exit 2; }
ARG=$1
if [ -f "$ARG" ]; then
  START=$(grep -oE '\([0-9]{10}\)' "$ARG" 2>/dev/null | tr -d '()' | head -1 || true)
  if [ -z "$START" ]; then
    START=$(stat -f %m "$ARG" 2>/dev/null || stat -c %Y "$ARG" 2>/dev/null || true)
  fi
else
  START=$ARG
fi
case "$START" in
  ''|*[!0-9]*) echo "bad timestamp: $START" >&2; exit 2;;
esac
NOW=$(date +%s)
SECS=$((NOW - START))
[ "$SECS" -ge 0 ] || SECS=0
MINS=$((SECS / 60))
printf '%dm %ds (%ds)\n' "$MINS" "$((SECS % 60))" "$SECS"
