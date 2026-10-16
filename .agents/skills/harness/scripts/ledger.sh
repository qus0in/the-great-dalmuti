#!/bin/sh
# Usage: ledger.sh [<task>]
# Scaffold the harness signal ledger at tmp/<task>/signals.md.
# <task> defaults to harness-<today> (UTC). Idempotent: never overwrites.
# Exit 0 + prints path; exit 2 usage error.
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)

[ $# -le 1 ] || { echo "usage: $0 [<task>]" >&2; exit 2; }

TASK=${1:-}
if [ -z "$TASK" ]; then
  TASK="harness-$(date -u +%Y-%m-%d)"
fi

case "$TASK" in
  *.*|*" "*|"") echo "ledger.sh: task must be a single path segment" >&2; exit 2 ;;
esac

FILE="$ROOT/tmp/$TASK/signals.md"

if [ -f "$FILE" ]; then
  echo "$FILE"
  exit 0
fi

mkdir -p "$ROOT/tmp/$TASK"

cat > "$FILE" <<'EOF'
# harness signals

- Ledger rows are the audit trail: never delete a row, mark it done.
- Each row: source path + quote, gap, proposed target (scratch/docs/skill/script/AGENTS).

| done | source + quote | gap | proposed target | unit / report |
| --- | --- | --- | --- | --- |
EOF

echo "$FILE"
