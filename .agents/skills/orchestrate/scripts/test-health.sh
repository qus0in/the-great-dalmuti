#!/bin/sh
# health.sh S20 tests (mock herdr): stalled, provider-error, normal, tail-only.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(git rev-parse --show-toplevel 2>/dev/null || (cd "$HERE/../../../.." && pwd))
FIX="$ROOT/tmp/health-test-$$"; mkdir -p "$FIX/bin"; trap 'rm -rf "$FIX"' EXIT
HEALTH="$HERE/health.sh"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
cat > "$FIX/dispatch.log" <<EOF
2020-01-01T00:00:00Z dispatched w16:p1 u-stalled model=M e
$NOW dispatched w16:p2 u-perr model=M e
$NOW dispatched w16:p3 u-ok model=M e
$NOW dispatched w16:p4 u-old model=M e
EOF
echo "status: in-progress" > "$FIX/report-u-ok.md"
printf '%s u-ok started | next: work\n' "$NOW" > "$FIX/progress-u-ok.md"
printf '%s u-perr started | next: work\n' "$NOW" > "$FIX/progress-u-perr.md"
printf '%s u-old started | next: work\n' "$NOW" > "$FIX/progress-u-old.md"
cat > "$FIX/bin/herdr" <<'EOF'
#!/bin/sh
if [ "$1" = "agent" ] && [ "$2" = "list" ]; then
  printf '{"result":{"agents":['
  printf '{"pane_id":"w16:p1","name":"w16:p1","agent":"opencode","agent_status":"idle","workspace_id":"t"},'
  printf '{"pane_id":"w16:p2","name":"w16:p2","agent":"opencode","agent_status":"idle","workspace_id":"t"},'
  printf '{"pane_id":"w16:p3","name":"w16:p3","agent":"opencode","agent_status":"idle","workspace_id":"t"},'
  printf '{"pane_id":"w16:p4","name":"w16:p4","agent":"opencode","agent_status":"idle","workspace_id":"t"}'
  printf ']}}\n'
  exit 0
fi
if [ "$1" = "pane" ] && [ "$2" = "read" ]; then
  case "$3" in
    w16:p1) printf 'working\nclean line\n';;
    w16:p2) printf 'line1\nError: This API key has expired\nError: Provider request failed with HTTP 500\n';;
    w16:p3) printf 'working\nclean line\n';;
    w16:p4)
      i=1; while [ "$i" -le 3 ]; do echo "old: quota exceeded for model"; i=$((i+1)); done
      i=1; while [ "$i" -le 12 ]; do echo "clean $i"; i=$((i+1)); done
      ;;
  esac
  exit 0
fi
exit 2
EOF
chmod +x "$FIX/bin/herdr"
export PATH="$FIX/bin:$PATH"
out=$("$HEALTH" "$FIX")
printf '%s\n' "$out" | grep -q "u-stalled.*stalled" || { echo "stalled case failed" >&2; printf '%s\n' "$out" >&2; exit 1; }
printf '%s\n' "$out" | grep -q "u-perr.*provider-error" || { echo "provider-error case failed" >&2; printf '%s\n' "$out" >&2; exit 1; }
printf '%s\n' "$out" | grep "u-ok" | grep -qw "ok" || { echo "normal case failed" >&2; printf '%s\n' "$out" >&2; exit 1; }
printf '%s\n' "$out" | grep "u-old" | grep -qw "ok" || { echo "tail-only case failed" >&2; printf '%s\n' "$out" >&2; exit 1; }
printf '%s\n' "$out" | grep "u-old" | grep -q "provider-error" && { echo "tail-only false positive" >&2; exit 1; } || true
# 4. health.sh detects delivered=no
echo "status: done" > "$FIX/report-p7-t2.md"
printf '2026-10-18T00:00:00Z dispatched w16:p7 p7-t2 model=M e\n' > "$FIX/dispatch.log"
printf '[2026-10-18T00:00:00Z] worker=w16:p7 unit=p7-t4 status=done report=%s target=w16:p2 token=cb-seed delivered=no\n' "$FIX/report-p7-t4.md" >> "$FIX/callbacks.log"
"$HEALTH" "$FIX" | grep -Fq "[미수신 콜백]" || exit 1
now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf '[2020-01-01T00:00:00Z] worker=w16:p7 unit=p7-pending-old status=done report=%s delivered=pending\n' "$FIX/report-old.md" >> "$FIX/callbacks.log"
printf '[%s] worker=w16:p7 unit=p7-pending-fresh status=done report=%s delivered=pending\n' "$now" "$FIX/report-fresh.md" >> "$FIX/callbacks.log"
out=$("$HEALTH" "$FIX")
printf '%s\n' "$out" | grep -q 'p7-pending-old .* pending>10m' || exit 1
printf '%s\n' "$out" | grep -q 'p7-pending-fresh' && exit 1 || true

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

echo "health tests: ok (pending age, legacy callbacks, row cap)"
