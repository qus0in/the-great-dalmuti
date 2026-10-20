#!/bin/sh
# Test for roles.sh (list/resolve/label, error paths) and workers.sh label column.
# Injects fake herdr output via ROLES_HERDR_JSON file; workers.sh via PATH-fake herdr.
# Live checks run only when herdr + context are available; otherwise skipped.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(git rev-parse --show-toplevel 2>/dev/null || (cd "$HERE/../../../.." && pwd))
FIX="$ROOT/tmp/roles-test-$$"; mkdir -p "$FIX"; trap 'rm -rf "$FIX"' EXIT
RO="$HERE/roles.sh"; WK="$HERE/workers.sh"
die() { echo "test-roles: $1" >&2; exit 1; }

# 1. Fake herdr payloads: w99 has o, r, w1 (panes p3+p4) and an empty labeled tab y; w88 has x.
TAB='{"result":{"tabs":[
 {"agent_status":"working","label":"o","pane_count":1,"tab_id":"w99:t1","workspace_id":"w99"},
 {"agent_status":"idle","label":"r","pane_count":1,"tab_id":"w99:t2","workspace_id":"w99"},
 {"agent_status":"working","label":"w1","pane_count":2,"tab_id":"w99:t3","workspace_id":"w99"},
 {"agent_status":"working","label":"y","pane_count":1,"tab_id":"w99:t5","workspace_id":"w99"},
 {"agent_status":"working","label":"x","pane_count":1,"tab_id":"w88:t9","workspace_id":"w88"}]}}'
PANE='{"result":{"panes":[
 {"agent":"claude","agent_status":"working","pane_id":"w99:p1","tab_id":"w99:t1","workspace_id":"w99"},
 {"agent":"agy","agent_status":"idle","pane_id":"w99:p2","tab_id":"w99:t2","workspace_id":"w99"},
 {"agent":"opencode","agent_status":"working","pane_id":"w99:p3","tab_id":"w99:t3","workspace_id":"w99"},
 {"agent":"codex","agent_status":"working","pane_id":"w99:p4","tab_id":"w99:t3","workspace_id":"w99"},
 {"agent":"opencode","agent_status":"done","pane_id":"w99:p7","tab_id":"w99:t4","workspace_id":"w99"},
 {"agent":"agy","agent_status":"working","pane_id":"w88:p1","tab_id":"w88:t9","workspace_id":"w88"}]}}'
printf '%s\n' "{\"tab list\": $TAB, \"pane list\": $PANE}" > "$FIX/capture.json"
export ROLES_HERDR_JSON="$FIX/capture.json"

chk() { [ "$2" = "$3" ] || { echo "test-roles: $1\n  exp: $2\n  got: $3" >&2; exit 1; }; }
code() { ( "$@" >/dev/null 2>&1 ); echo $?; }

# 2. list: labeled tabs only, first pane, other workspace filtered
out=$("$RO" list --workspace w99)
chk "list rows" "o w99:p1 claude working
r w99:p2 agy idle
w1 w99:p3 opencode working" "$out"
[ "0" = "$(code "$RO" list --workspace w99)" ] || die "list rc"
warn=$("$RO" list --workspace w99 2>&1 1>/dev/null)
case "$warn" in *"w1"*"2 panes"*) :;; *) die "multi-pane warn missing: $warn";; esac

# 3. resolve: pane passthrough (no herdr/context needed), label lookup, unknown label
chk "resolve passthrough" "w99:p3" "$("$RO" resolve w99:p3)"; [ "w99:p9" = "$(env -u HERDR_ENV -u HERDR_WORKSPACE_ID -u HERDR_PANE_ID "$RO" resolve w99:p9)" ] || die "passthrough w/o live herdr rc"
chk "resolve r" "w99:p2" "$("$RO" resolve r --workspace w99)"
chk "resolve w1 uses first pane" "w99:p3" "$("$RO" resolve w1 --workspace w99)"
chk "resolve unknown rc" "1" "$(code "$RO" resolve w9 --workspace w99)"; [ -z "$("$RO" resolve w9 --workspace w99 2>/dev/null)" ] || die "unknown label printed stdout"
[ "2" = "$(env -u HERDR_ENV -u HERDR_WORKSPACE_ID -u HERDR_PANE_ID "$RO" resolve w1 >/dev/null 2>&1; echo $?)" ] || die "context failure must demand --workspace"

# 4. label: labeled pane, unlabeled tab pane, unknown pane, malformed pane id
chk "label of p2" "r" "$("$RO" label w99:p2)"
chk "label of p3" "w1" "$("$RO" label w99:p3)"
chk "label of p7 (unlabeled tab)" "" "$("$RO" label w99:p7)"
chk "label unknown pane" "" "$("$RO" label w99:p8)"; [ "0" = "$(code "$RO" label w99:p8)" ] || die "unknown pane label rc"
chk "label of cross-ws pane" "x" "$("$RO" label w88:p1)"
[ "2" = "$(code "$RO" label bad-pane)" ] || die "bad pane id rc"

# 5. malformed injection / missing file
printf '%s\n' '{"tab list": 42, "pane list": {}}' > "$FIX/bad.json"
[ "1" = "$(ROLES_HERDR_JSON="$FIX/bad.json" code "$RO" list --workspace w99)" ] || die "malformed payload rc"
[ "2" = "$(ROLES_HERDR_JSON="$FIX/nope.json" code "$RO" list --workspace w99)" ] || die "missing capture file rc"

# 6. workers.sh label column via PATH-fake herdr (uses same tab/pane payloads)
AG='{"result":{"agents":[
 {"agent":"opencode","agent_status":"working","name":"tA","pane_id":"w99:p3","workspace_id":"w99"},
 {"agent":"codex","agent_status":"working","name":"tB","pane_id":"w99:p4","workspace_id":"w99"},
 {"agent":"opencode","agent_status":"done","name":"tC","pane_id":"w99:p7","workspace_id":"w99"}]}}'
cat > "$FIX/bin-herdr" <<EOF
#!/bin/sh
[ "\$1 \$2" = "agent list" ] && { printf '%s\n' '$AG'; exit 0; }
[ "\$1 \$2 \$3" = "pane get w99:p0" ] && { printf '%s\n' '{"result":{"pane":{"pane_id":"w99:p0","workspace_id":"w99","agent":"claude","agent_status":"working"}}}'; exit 0; }
[ "\$1 \$2" = "tab list" ] && { printf '%s\n' '$TAB'; exit 0; }
[ "\$1 \$2" = "pane list" ] && { printf '%s\n' '$PANE'; exit 0; }
exit 2
EOF
mkdir -p "$FIX/bin" "$FIX/empty"; cp "$FIX/bin-herdr" "$FIX/bin/herdr"; chmod +x "$FIX/bin/herdr"
WRK() { env -u HERDR_WORKSPACE_ID -u HERDR_TAB_ID -u HERDR_PANE_ID -u ROLES_HERDR_JSON PATH="$FIX/bin:$PATH" HERDR_ENV=1 "$WK" "$@"; }
old=$(WRK --no-label --workspace w99 --self-pane w99:p0)
chk "workers --no-label old format" "tA opencode working
tB codex working
tC opencode done" "$old"
new=$(WRK --workspace w99 --self-pane w99:p0)
chk "workers default labeled" "w1 tA opencode working
w1 tB codex working
- tC opencode done" "$new"
mod=$(WRK --model --workspace w99 --self-pane w99:p0)
case "$mod" in w1\ tA\ *|-\ tC\ *) :;; *) die "--model labeled mismatch: $mod";; esac
[ "0" != "$(code env PATH="$FIX/empty" "$WK" --workspace w99 --self-pane w99:p0)" ] || die "herdr failure must fail workers.sh"

# 7. live sanity (skipped without herdr): 5 labeled roles in the caller's workspace
unset ROLES_HERDR_JSON
if command -v herdr >/dev/null 2>&1 && HERDR_ENV=1 "$HERE/context.sh" >/dev/null 2>&1; then
  live=$("$RO" list)
  [ "$(printf '%s\n' "$live" | wc -l | tr -d ' ')" = "5" ] || die "live list rows: $live"
  labels="$(printf '%s\n' "$live" | cut -d' ' -f1 | tr '\n' ' ')"
  chk "live labels" "o r w1 w2 w3 " "$labels"
  rpane=$(printf '%s\n' "$live" | awk '$1 == "r" { print $2 }')
  chk "live resolve r matches list" "$rpane" "$("$RO" resolve r)"
  w3pane=$(printf '%s\n' "$live" | awk '$1 == "w3" { print $2 }')
  chk "live resolve w3 matches list" "$w3pane" "$("$RO" resolve w3)"
fi

echo "roles tests: ok (list/resolve/label, workers label column, errors)"
