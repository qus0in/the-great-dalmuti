#!/bin/sh
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(git rev-parse --show-toplevel 2>/dev/null || (cd "$HERE/../../../.." && pwd))
FIX="$ROOT/tmp/notify-test-$$"; mkdir -p "$FIX/bin"; trap 'rm -rf "$FIX"' EXIT
ORCH_DIR="$ROOT/.agents/skills/orchestrate/scripts"
[ -f "$HERE/notify.sh" ] && NOTIFY="$HERE/notify.sh" || NOTIFY="$ORCH_DIR/notify.sh"
[ -f "$HERE/health.sh" ] && HEALTH="$HERE/health.sh" || HEALTH="$ORCH_DIR/health.sh"

# 1. dry-run prints prompt and record without writing logs
out=$(HERDR_ENV=1 "$NOTIFY" --dry-run --self-pane w16:p7 w16:p2 "$FIX/report-p7-t1.md" "dry test")
printf '%s\n' "$out" | grep -Fq "[dry-run] prompt w16:p2:" || exit 1
printf '%s\n' "$out" | grep -Fq "[dry-run] record:" || exit 1
[ ! -f "$FIX/callbacks.log" ] || exit 1

# 2. CLI success but pane read has no token (B1 failure -> delivered=no)
cat << 'EOF' > "$FIX/bin/herdr"
#!/bin/sh
[ "$1 $2" = "agent prompt" ] && exit 0
[ "$1 $2" = "pane read" ] && exit 0
exit 2
EOF
chmod +x "$FIX/bin/herdr"
rc=0; NOTIFY_BACKOFFS="" NOTIFY_VERIFY_TRIES=1 NOTIFY_VERIFY_SLEEP=0 PATH="$FIX/bin:$PATH" HERDR_ENV=1 \
  "$NOTIFY" --self-pane w16:p7 w16:p2 "$FIX/report-p7-t2.md" "unverified" >/dev/null 2>&1 || rc=$?
[ "$rc" -eq 1 ] || exit 1
grep -q "unit=p7-t2 .* delivered=no" "$FIX/callbacks.log" || exit 1

# 3. CLI success AND pane read reflects token (B1 success -> delivered=yes)
cat << 'EOF' > "$FIX/bin/herdr"
#!/bin/sh
[ "$1 $2" = "agent prompt" ] && { echo "$4" > "$HERDR_CAPTURE"; exit 0; }
[ "$1 $2" = "pane read" ] && { cat "$HERDR_CAPTURE" 2>/dev/null; exit 0; }
exit 2
EOF
chmod +x "$FIX/bin/herdr"
export HERDR_CAPTURE="$FIX/pane.txt"
PATH="$FIX/bin:$PATH" NOTIFY_BACKOFFS="" NOTIFY_VERIFY_TRIES=1 NOTIFY_VERIFY_SLEEP=0 HERDR_ENV=1 \
  "$NOTIFY" --self-pane w16:p7 w16:p2 "$FIX/report-p7-t3.md" "verified" >/dev/null
grep -q "unit=p7-t3 .* delivered=yes" "$FIX/callbacks.log" || exit 1

# 4. health.sh detects delivered=no
echo "status: done" > "$FIX/report-p7-t2.md"
printf '2026-10-18T00:00:00Z dispatched w16:p7 p7-t2 model=M e\n' > "$FIX/dispatch.log"
"$HEALTH" "$FIX" | grep -Fq "[미수신 콜백]" || exit 1

# 5. B4: legacy unknown with unrelated review (pE-review-build vs pD-ui) or earlier review is RETAINED
cat <<EOF > "$FIX/callbacks.log"
[2026-10-18T01:00:00Z] worker=w16:pD unit=pD-ui status=done report=$FIX/report-pD-ui.md
EOF
echo "status: done" > "$FIX/report-pD-ui.md"
# Dispatch of pD-ui plus earlier review (00:55) and unrelated review (01:05 pE-review-build)
printf '2026-10-18T00:50:00Z dispatched w16:pD pD-ui model=M e\n' > "$FIX/dispatch.log"
printf '2026-10-18T00:55:00Z dispatched w16:pE pE-review-ui model=M e\n' >> "$FIX/dispatch.log"
printf '2026-10-18T01:05:00Z dispatched w16:pE pE-review-build model=M e\n' >> "$FIX/dispatch.log"
echo "status: done" > "$FIX/report-pE-review-build.md"
"$HEALTH" "$FIX" | grep -q "pD-ui .* unknown" || exit 1

# Same unit subsequent review (01:10) CLEARS it
printf '2026-10-18T01:10:00Z dispatched w16:pE pE-review-ui model=M e\n' >> "$FIX/dispatch.log"
echo "status: done" > "$FIX/report-pE-review-ui.md"
"$HEALTH" "$FIX" | grep -Fq "pD-ui" && exit 1 || true

# 6. B3: total output strictly <= 20 lines with 5 unfinished + 25 unreceived callbacks
: > "$FIX/callbacks.log"; : > "$FIX/dispatch.log"
for i in $(seq 1 5); do
  printf '2026-10-18T01:00:00Z dispatched w16:p%d unit-act%d model=M e\n' "$i" "$i" >> "$FIX/dispatch.log"
done
for i in $(seq 1 25); do
  printf '[2026-10-18T02:%02d:00Z] worker=w16:p1 unit=cb%d status=done report=r%d.md delivered=no\n' "$i" "$i" "$i" >> "$FIX/callbacks.log"
done
total_lines=$("$HEALTH" "$FIX" | wc -l | tr -d ' ')
[ "$total_lines" -le 20 ] || { echo "health output $total_lines > 20" >&2; exit 1; }
"$HEALTH" "$FIX" | grep -Fq "... (row cap 20 reached, contract)" || exit 1

echo "notify and health tests: ok"
