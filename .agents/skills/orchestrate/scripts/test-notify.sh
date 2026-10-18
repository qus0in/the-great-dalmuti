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

# 2. CLI success but pane read has no token (failure -> pending, exit 0, retry detached)
cat << 'EOF' > "$FIX/bin/herdr"
#!/bin/sh
[ "$1 $2" = "agent list" ] && { printf '{"result":{"agents":[]}}'; exit 0; }
[ "$1 $2" = "agent prompt" ] && exit 0
[ "$1 $2" = "pane read" ] && exit 0
exit 2
EOF
chmod +x "$FIX/bin/herdr"
export PATH="$FIX/bin:$PATH"
rc=0; NOTIFY_DETACH=0 NOTIFY_VERIFY_TRIES=1 NOTIFY_VERIFY_SLEEP=0 PATH="$FIX/bin:$PATH" HERDR_ENV=1 \
  "$NOTIFY" --self-pane w16:p7 w16:p2 "$FIX/report-p7-t2.md" "unverified" >/dev/null 2>&1 || rc=$?
[ "$rc" -eq 0 ] || exit 1
grep -q "unit=p7-t2 .* delivered=pending" "$FIX/callbacks.log" || exit 1

# 2b. redeliver logs Herdr stderr and appends no/yes outcomes
[ -f "$HERE/redeliver.sh" ] && RED="$HERE/redeliver.sh" || RED="$ORCH_DIR/redeliver.sh"
"$RED" "$FIX" | grep -q "unit=p7-t2 .* delivered=pending" || exit 1
cat > "$FIX/bin/herdr" <<'EOF'
#!/bin/sh
[ "$1 $2" = "agent prompt" ] && { echo "mock retry error" >&2; exit 2; }
[ "$1 $2" = "pane read" ] && exit 0
exit 2
EOF
chmod +x "$FIX/bin/herdr"
REDELIVER_BACKOFFS="" REDELIVER_VERIFY_TRIES=1 REDELIVER_VERIFY_SLEEP=0 "$RED" "$FIX" --resend --unit p7-t2 >/dev/null 2>&1
grep -q "unit=p7-t2 .* delivered=no" "$FIX/callbacks.log" || exit 1
grep -Fq "mock retry error" "$FIX/redeliver.log" || exit 1
cat << 'EOF' > "$FIX/bin/herdr"
#!/bin/sh
[ "$1 $2" = "agent list" ] && { printf '{"result":{"agents":[]}}'; exit 0; }
[ "$1 $2" = "agent prompt" ] && { echo "$4" > "$HERDR_CAPTURE"; exit 0; }
[ "$1 $2" = "pane read" ] && { cat "$HERDR_CAPTURE" 2>/dev/null; exit 0; }
exit 2
EOF
chmod +x "$FIX/bin/herdr"
export HERDR_CAPTURE="$FIX/pane.txt"
REDELIVER_BACKOFFS="" REDELIVER_VERIFY_TRIES=1 REDELIVER_VERIFY_SLEEP=0 PATH="$FIX/bin:$PATH" "$RED" "$FIX" --resend --unit p7-t2 >/dev/null 2>&1
grep -q "unit=p7-t2 .* delivered=yes" "$FIX/callbacks.log" || exit 1
n1=$(wc -l < "$FIX/callbacks.log")
REDELIVER_BACKOFFS="" REDELIVER_VERIFY_TRIES=1 REDELIVER_VERIFY_SLEEP=0 PATH="$FIX/bin:$PATH" "$RED" "$FIX" --resend --unit p7-t2 >/dev/null 2>&1
n2=$(wc -l < "$FIX/callbacks.log")
[ "$n1" -eq "$n2" ] || exit 1

# 3. CLI success AND pane read reflects token (B1 success -> delivered=yes)
PATH="$FIX/bin:$PATH" NOTIFY_DETACH=0 NOTIFY_VERIFY_TRIES=1 NOTIFY_VERIFY_SLEEP=0 HERDR_ENV=1 \
  "$NOTIFY" --self-pane w16:p7 w16:p2 "$FIX/report-p7-t3.md" "verified" >/dev/null
grep -q "unit=p7-t3 .* delivered=yes" "$FIX/callbacks.log" || exit 1

# 3b. detached retry survives its caller shell with Herdr caller IDs unset
cat > "$FIX/bin/herdr" <<'EOF'
#!/bin/sh
if [ "$1 $2" = "agent list" ]; then printf '{"result":{"agents":[]}}'; exit 0; fi
if [ "$1 $2" = "agent prompt" ]; then
  printf 'workspace=%s tab=%s pane=%s\n' "${HERDR_WORKSPACE_ID-unset}" "${HERDR_TAB_ID-unset}" "${HERDR_PANE_ID-unset}" >> "$HERDR_TRACE"
  n=0; [ ! -f "$HERDR_COUNT" ] || n=$(cat "$HERDR_COUNT")
  n=$((n + 1)); printf '%s\n' "$n" > "$HERDR_COUNT"
  [ "$n" -eq 1 ] || printf '%s\n' "${4-}" > "$HERDR_CAPTURE"
  exit 0
fi
if [ "$1 $2" = "pane read" ]; then cat "$HERDR_CAPTURE" 2>/dev/null; exit 0; fi
exit 2
EOF
chmod +x "$FIX/bin/herdr"
export HERDR_TRACE="$FIX/herdr-detached.log" HERDR_COUNT="$FIX/herdr-count" HERDR_CAPTURE="$FIX/herdr-pane.txt"
env -u HERDR_WORKSPACE_ID -u HERDR_TAB_ID -u HERDR_PANE_ID HERDR_ENV=1 \
  NOTIFY_DETACH=1 NOTIFY_VERIFY_TRIES=1 NOTIFY_VERIFY_SLEEP=0 REDELIVER_BACKOFFS= REDELIVER_VERIFY_TRIES=1 REDELIVER_VERIFY_SLEEP=0 \
  sh -c '"$1" --self-pane w16:p7 w16:p2 "$2/report-p7-t3b.md" detached' sh "$NOTIFY" "$FIX" > "$FIX/detached.out" 2>&1
grep -q "unit=p7-t3b .* delivered=pending" "$FIX/callbacks.log" || exit 1
i=0
while [ "$i" -lt 10 ] && ! grep -q "unit=p7-t3b .* delivered=yes" "$FIX/callbacks.log"; do sleep 1; i=$((i + 1)); done
grep -q "unit=p7-t3b .* delivered=yes" "$FIX/callbacks.log" || { cat "$FIX/redeliver.log" >&2; exit 1; }
grep -q 'workspace=unset tab=unset pane=unset' "$HERDR_TRACE" || exit 1

echo "notify tests: ok (sync delivery and detached retry)"
