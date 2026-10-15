#!/bin/sh
# Persist the rendered handoff block while preserving surrounding notes.
snapshot_write() {
TARGET_MD="$ROOT/tmp/$TASK/handoff.md"
mkdir -p "$(dirname "$TARGET_MD")"

if [ -f "$TARGET_MD" ]; then
  if grep -q '<!-- handoff:begin -->' "$TARGET_MD" && grep -q '<!-- handoff:end -->' "$TARGET_MD"; then
    TMP_OUT=$(mktemp) || die 1 "mktemp failed"
    awk -v bfile="$BLOCK_FILE" '
      /<!-- handoff:begin -->/ {
        while ((getline line < bfile) > 0) print line
        close(bfile)
        skip = 1
        next
      }
      /<!-- handoff:end -->/ {
        skip = 0
        next
      }
      !skip { print }
    ' "$TARGET_MD" > "$TMP_OUT" && mv "$TMP_OUT" "$TARGET_MD"
  else
    {
      echo ""
      cat "$BLOCK_FILE"
    } >> "$TARGET_MD"
  fi
else
  {
    echo "# $TASK handoff"
    echo ""
    cat "$BLOCK_FILE"
  } > "$TARGET_MD"
fi

echo "tmp/$TASK/handoff.md"
}
