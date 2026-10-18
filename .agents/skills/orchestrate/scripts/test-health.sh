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
out=$(PATH="$FIX/bin:$PATH" "$HEALTH" "$FIX")
printf '%s\n' "$out" | grep -q "u-stalled.*stalled" || { echo "stalled case failed" >&2; printf '%s\n' "$out" >&2; exit 1; }
printf '%s\n' "$out" | grep -q "u-perr.*provider-error" || { echo "provider-error case failed" >&2; printf '%s\n' "$out" >&2; exit 1; }
printf '%s\n' "$out" | grep "u-ok" | grep -qw "ok" || { echo "normal case failed" >&2; printf '%s\n' "$out" >&2; exit 1; }
printf '%s\n' "$out" | grep "u-old" | grep -qw "ok" || { echo "tail-only case failed" >&2; printf '%s\n' "$out" >&2; exit 1; }
printf '%s\n' "$out" | grep "u-old" | grep -q "provider-error" && { echo "tail-only false positive" >&2; exit 1; } || true
echo "health tests: ok (stalled, provider-error, normal, tail-only)"
