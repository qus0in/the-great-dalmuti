#!/bin/sh
# Usage: checkpoint.sh <task> <unit> <summary> <next>
# Append one-line progress record to tmp/<task>/progress-<unit>.md.
# Exit 0 on success; 1 if task dir missing or unwritable; 2 on bad args.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
die() { rc=$1; shift; echo "checkpoint.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 <task> <unit> <summary> <next>"; }

[ $# -eq 4 ] || usage
case "$1" in -*) usage;; esac
[ -n "$1" ] && [ -n "$2" ] && [ -n "$3" ] && [ -n "$4" ] || usage

TASK=$1; UNIT=$2; SUMMARY=$3; NEXT=$4
TASK=${TASK%/}

case "$UNIT" in */*|*[[:space:]]*) die 2 "invalid unit name: $UNIT";; esac

case "$TASK" in
  /*) TASK_DIR="$TASK";;
  tmp/*) TASK_DIR="$ROOT/$TASK";;
  *)
    if [ -d "$ROOT/tmp/$TASK" ]; then
      TASK_DIR="$ROOT/tmp/$TASK"
    elif [ -d "$TASK" ]; then
      TASK_DIR="$TASK"
    else
      TASK_DIR="$ROOT/tmp/$TASK"
    fi
    ;;
esac

[ -d "$TASK_DIR" ] || die 1 "task directory does not exist: $TASK_DIR"

PROGRESS_FILE="$TASK_DIR/progress-$UNIT.md"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf '%s %s %s | next: %s\n' "$TS" "$UNIT" "$SUMMARY" "$NEXT" >> "$PROGRESS_FILE" 2>/dev/null || die 1 "cannot write progress: $PROGRESS_FILE"
