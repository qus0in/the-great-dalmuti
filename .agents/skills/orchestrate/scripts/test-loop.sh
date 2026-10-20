#!/bin/sh
# Usage: test-loop.sh [--real <o-pane> <author-label>]
# Fake 4 loop paths (accept / block→fix→accept / block×2 / snapshot-differ) with
# stub herdr+context+roles; --real runs one tiny unit for real (notifies o first).
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
REAL=0; OPANE=; RLAUTH=
if [ "${1:-}" = "--real" ]; then REAL=1; OPANE=${2:?o-pane required}; RLAUTH=${3:?author required}; fi
RPANE=${HERDR_PANE_ID:-}; RWS=${HERDR_WORKSPACE_ID:-}; OPATH=$PATH
T="loop-test-$$"; TD="$ROOT/tmp/$T"; mkdir -p "$TD/bin"
trap 'rm -rf "$TD"' EXIT
cat > "$TD/bin/herdr" <<'EOF'
#!/bin/sh
CAP="${LOOP_CAPTURE:-/dev/null}"
case "$1 $2" in
  "agent prompt") printf '%s\n---\n' "$4" >> "$CAP"; exit 0;;
  "pane read") cat "$CAP" 2>/dev/null; exit 0;;
  "agent list") printf '{"result":{"agents":[]}}'; exit 0;;
  "pane get") printf '{"result":{"pane":{"pane_id":"%s","workspace_id":"w","agent":"x"}}}' "${HERDR_PANE_ID:-self}"; exit 0;;
  "agent get") printf '{"result":{"agent":{"pane_id":"p","workspace_id":"w","agent":"x","agent_status":"idle"}}}'; exit 0;;
esac
exit 2
EOF
printf '#!/bin/sh\nprintf \x27{"self_pane":"o-pane","targets":[{"agent":"x","agent_status":"idle"}]}\x27\n' > "$TD/bin/context"
printf '#!/bin/sh\n[ "$1" = resolve ] || exit 2\ncase "$2" in w1) echo wpane1;; r) echo rpane;; *) exit 1;; esac\n' > "$TD/bin/roles"
chmod +x "$TD/bin/herdr" "$TD/bin/context" "$TD/bin/roles"
export PATH="$TD/bin:$PATH" HERDR_ENV=1 HERDR_PANE_ID=fake-self
export DISPATCH_CTX_CMD="$TD/bin/context" DISPATCH_WAIT_INTERVAL=0 ROLES_SH="$TD/bin/roles"
export NOTIFY_VERIFY_TRIES=1 NOTIFY_VERIFY_SLEEP=0 NOTIFY_DETACH=0 LOOP_NOTIFY=o-pane
chk() { grep -Fq "$1" "$2" || { echo "FAIL: [$1] not in $2" >&2; exit 1; }; }
mkunit() { U=$1; printf 'x\n' > "$TD/f-$U.txt"
  printf '# unit %s\n- Owned: tmp/%s/report-%s.md\n## 완료 기준\n한 줄 파일 존재.\n' "$U" "$T" "$U" > "$TD/brief-$U.md"
  "$HERE/run.sh" "$T" "$U" w1 "$TD/brief-$U.md" --reviewer r >/dev/null
  [ -f "$TD/loop-$U.state" ] || { echo "FAIL: no state $U" >&2; exit 1; }; }
adone() { printf 'status: done\nblocking: 0\nsummary: %s done\nfiles: tmp/%s/f-%s.txt\n\nbody.\n' "$1" "$T" "$1" > "$TD/report-$1.md"; }
rrep() { B=0; [ "$2" = block ] && B=1
  printf 'status: done\nverdict: %s\nblocking: %s\nsummary: review %s %s\n## 차단\n- item-%s-bad\n## 관찰\n- minor note\n' "$2" "$B" "$1" "$2" "$1" > "$TD/review-r-$1.md"; }
gohand() { export LOOP_CAPTURE="$TD/cap-$1"; : > "$TD/cap-$1"; "$HERE/handover.sh" "$T" "$1" >/dev/null; }
mkunit p1; chk "dispatched wpane1" "$TD/dispatch.log"
adone p1; gohand p1; chk "verdict.sh $T p1" "$TD/cap-p1"
[ -f "$TD/snapshot-p1.tar.gz" ] || { echo "FAIL: no snapshot p1" >&2; exit 1; }
rrep p1 accept; "$HERE/verdict.sh" "$T" p1 >/dev/null
chk "unit=p1 status=done" "$TD/callbacks.log"; chk "[summary]" "$TD/cap-p1"
mkunit p2; adone p2; gohand p2; rrep p2 block; "$HERE/verdict.sh" "$T" p2 >/dev/null
F="$TD/brief-w1-p2-fix1.md"; [ -f "$F" ] || { echo "FAIL: no fix1" >&2; exit 1; }
chk "item-p2-bad" "$F"; chk "round=1" "$TD/loop-p2.state"
if grep -Fq "minor note" "$F"; then echo "FAIL: non-blocking leaked" >&2; exit 1; fi
adone p2; gohand p2; rrep p2 accept; "$HERE/verdict.sh" "$T" p2 >/dev/null
chk "unit=p2 status=done" "$TD/callbacks.log"
mkunit p3; adone p3; gohand p3; rrep p3 block; "$HERE/verdict.sh" "$T" p3 >/dev/null
adone p3; gohand p3; rrep p3 block; "$HERE/verdict.sh" "$T" p3 >/dev/null
chk "round=2" "$TD/loop-p3.state"; [ -f "$TD/brief-w1-p3-fix2.md" ] || { echo "FAIL: no fix2" >&2; exit 1; }
adone p3; gohand p3; rrep p3 block; "$HERE/verdict.sh" "$T" p3 >/dev/null
chk "unit=p3 status=blocked" "$TD/callbacks.log"
if [ -f "$TD/brief-w1-p3-fix3.md" ]; then echo "FAIL: fix3 created" >&2; exit 1; fi
mkunit p4; adone p4; gohand p4; printf 'changed\n' > "$TD/f-p4.txt"
rrep p4 accept; "$HERE/verdict.sh" "$T" p4 >/dev/null
chk "unit=p4 status=blocked" "$TD/callbacks.log"; chk "scope violation" "$TD/callbacks.log"
echo "loop tests: ok (accept, fix-accept, blocked2, snapshot-differ)"
if [ "$REAL" -eq 1 ]; then
  RT=harness-roles; SU=selftest-1; RB="tmp/$RT/brief-tmp.md"; RC="tmp/$RT/callbacks.log"
  unset DISPATCH_CTX_CMD ROLES_SH LOOP_CAPTURE; export PATH="$OPATH" LOOP_NOTIFY="$OPANE"
  if [ -n "$RWS" ]; then export HERDR_WORKSPACE_ID="$RWS"; else unset HERDR_WORKSPACE_ID; fi
  if [ -n "$RPANE" ]; then export HERDR_PANE_ID="$RPANE"; else unset HERDR_PANE_ID; fi
  "$HERE/notify.sh" --self-pane "${RPANE:-unknown}" "$OPANE" "tmp/$RT/report-w3-loop.md" "loop real-path starting" >/dev/null
  mkdir -p "$ROOT/tmp/$RT/selftest"
  printf '# tiny\n- Owned: tmp/%s/report-%s.md\n## 완료 기준\nnote 한 줄.\n' "$RT" "$SU" > "$ROOT/$RB"
  LOOP_NOTIFY="$OPANE" "$HERE/run.sh" "$RT" "$SU" "$RLAUTH" "$RB" --criteria "note 한 줄" >/dev/null
  i=0; while [ "$i" -lt 60 ]; do grep -Fq "unit=$SU " "$ROOT/$RC" 2>/dev/null && break; sleep 10; i=$((i+1)); done
  n=$(grep -c "unit=$SU " "$ROOT/$RC" 2>/dev/null || true)
  [ "$n" -eq 1 ] || { echo "FAIL: o got $n notifies (want 1)" >&2; exit 1; }
  grep -Fq "[summary]" "$ROOT/$RC" || { echo "FAIL: no summary" >&2; exit 1; }
  grep "unit=$SU " "$ROOT/$RC"
  echo "loop real: ok (o notified once, with summary)"
fi
