# Called (not run) by signals.sh: 7 collectors; helpers live in signals.sh.
# Caller globals: SINCE_EPOCH, CAPT (mktemp), set -eu; caller cd'd to repo root.
# Contract: cap each section at 20 lines; skip files with mtime < SINCE_EPOCH (0 disables).

collect_review() {
  section "[review]"; : > "$CAPT"
  for f in tmp/*/review-*.md; do
    [ -e "$f" ] || continue
    is_new "$f" || continue
    { printf '  %s\n' "$f"; awk '
      /^### *[Bb]locking/ { inb=1; next }
      /^#{2,3} /          { inb=0 }
      inb && NF           { printf "    - %s\n", $0 }' "$f" | head -10; } >> "$CAPT"
  done
  emit
}

collect_gate() {
  section "[gate-failed]"; : > "$CAPT"
  for f in tmp/*/verify-*.log; do
    [ -e "$f" ] || continue
    is_new "$f" || continue
    grep -qx "ok" "$f" 2>/dev/null && continue
    printf '%s: %s\n' "$f" "$(head -3 "$f" | tr '\n' ' ' | cut -c1-160)" >> "$CAPT"
  done
  emit
}

collect_triage() {
  section "[triage]"; : > "$CAPT"
  for f in tmp/*/triage.log; do
    [ -e "$f" ] || continue
    is_new "$f" || continue
    sed "s|^|$f: |" "$f" | cut -c1-200 >> "$CAPT"
  done
  emit
}

collect_cb() {
  section "[blocked-callback]"; : > "$CAPT"
  for f in tmp/*/callbacks.log tmp/*/state.md; do
    [ -e "$f" ] || continue
    is_new "$f" || continue
    case "$f" in
      *callbacks.log) pat='status=(blocked|failed)';;
      *)              pat=' callback (blocked|failed)';;
    esac
    grep -E "$pat" "$f" 2>/dev/null | sed "s|^|$f: |" >> "$CAPT"
  done
  emit
}

collect_verdict() {
  section "[verdict-block]"; : > "$CAPT"
  for f in tmp/*/review-*.md; do
    [ -e "$f" ] || continue
    is_new "$f" || continue
    grep -E '^VERDICT.*BLOCK' "$f" 2>/dev/null | sed "s|^|$f: |" >> "$CAPT"
  done
  emit
}

collect_repeated() {
  section "[repeated-step]"; : > "$CAPT"
  for f in tmp/*/brief-*.md; do
    [ -e "$f" ] || continue
    is_new "$f" || continue
    awk '/^# *[Hh]ow/{inh=1;next} /^#/{inh=0} inh && NF {print}' "$f" >> "$CAPT"
  done
  sed 's/^ *//; s/ *$//' "$CAPT" | sort | uniq -c | sort -rn | awk '$1>=2 && length($0)>40' | head -10 > "$CAPT"
  emit
}

collect_ptr() {
  section "[stale-scratch-pointer]"; : > "$CAPT"
  grep -rn -E 'tmp/[[:alnum:]][[:alnum:]/._-]*' \
    --exclude-dir=prompt AGENTS.md docs .agents/skills 2>/dev/null >> "$CAPT" || true
  emit
}
