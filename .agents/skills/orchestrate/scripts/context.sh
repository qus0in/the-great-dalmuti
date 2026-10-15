#!/bin/sh
# Usage: context.sh [--workspace ID --self-pane ID] [--target T]...
# Resolve + validate orchestrator context against live herdr data.
# stdout: one JSON object. stderr: error. Exit 0 ok; 2 usage/missing/partial context; 1 invalid/mismatch/herdr failure.
# Identity = explicit flags, else inherited nonempty HERDR_WORKSPACE_ID + HERDR_PANE_ID. Never focus/cwd.
# JSON: {ok,source,workspace_id,self_pane,self_agent,targets:[{input,pane_id,name,agent,agent_status,workspace_id}]}
set -u
die() { rc=$1; shift; echo "context.sh: $*" >&2; exit "$rc"; }
usage() { echo "usage: $0 [--workspace ID --self-pane ID] [--target T]..." >&2; exit 2; }
WS=; SELF=; WS_SET=0; SELF_SET=0
TF=$(mktemp) || die 1 "mktemp failed"
trap 'rm -f "$TF"' EXIT INT TERM
while [ $# -gt 0 ]; do
  case "$1" in
    --workspace) [ $# -ge 2 ] || usage; WS=$2; WS_SET=1; shift 2;;
    --self-pane) [ $# -ge 2 ] || usage; SELF=$2; SELF_SET=1; shift 2;;
    --target)
      [ $# -ge 2 ] || usage
      case "$2" in ''|-*|*[![:print:]]*) die 2 "bad target: '$2'";; esac
      printf '%s\n' "$2" >> "$TF"; shift 2;;
    *) usage;;
  esac
done
[ "${HERDR_ENV:-}" = 1 ] || die 2 "HERDR_ENV is not 1: run inside a herdr pane"
command -v herdr >/dev/null 2>&1 || die 1 "herdr not found in PATH"
command -v jq >/dev/null 2>&1 || die 1 "jq not found in PATH"
goodid() { case "$1" in ''|-*|*[!A-Za-z0-9:._-]*) return 1;; esac; return 0; }
IW=${HERDR_WORKSPACE_ID:-}; IP=${HERDR_PANE_ID:-}
if [ "$WS_SET" -eq 1 ] || [ "$SELF_SET" -eq 1 ]; then
  { [ "$WS_SET" -eq 1 ] && [ "$SELF_SET" -eq 1 ]; } || die 2 "partial explicit context: pass both --workspace ID and --self-pane ID"
  goodid "$WS" || die 2 "invalid --workspace value: '$WS'"
  goodid "$SELF" || die 2 "invalid --self-pane value: '$SELF'"
  [ -z "$IW" ] || [ "$IW" = "$WS" ] || die 1 "explicit --workspace $WS conflicts with inherited HERDR_WORKSPACE_ID=$IW"
  [ -z "$IP" ] || [ "$IP" = "$SELF" ] || die 1 "explicit --self-pane $SELF conflicts with inherited HERDR_PANE_ID=$IP"
  SRC=explicit
else
  if [ -z "$IW" ] && [ -z "$IP" ]; then
    die 2 "caller IDs unavailable (HERDR_WORKSPACE_ID and HERDR_PANE_ID unset or empty); explicit verified IDs required (--workspace ID --self-pane ID); no automatic focus fallback"
  fi
  { [ -n "$IW" ] && [ -n "$IP" ]; } || die 2 "partial inherited context (HERDR_WORKSPACE_ID='$IW' HERDR_PANE_ID='$IP'); pass --workspace ID --self-pane ID"
  goodid "$IW" || die 2 "invalid HERDR_WORKSPACE_ID: '$IW'"
  goodid "$IP" || die 2 "invalid HERDR_PANE_ID: '$IP'"
  WS=$IW; SELF=$IP; SRC=inherited
fi
pj=$(herdr pane get "$SELF" 2>/dev/null </dev/null) || die 1 "self pane not found: $SELF (stale or wrong --self-pane)"
printf '%s\n' "$pj" | jq -e '.result.pane | type == "object"' >/dev/null 2>&1 || die 1 "malformed 'herdr pane get $SELF' output"
pp=$(printf '%s\n' "$pj" | jq -r '.result.pane.pane_id // empty')
pw=$(printf '%s\n' "$pj" | jq -r '.result.pane.workspace_id // empty')
SELF_AGENT=$(printf '%s\n' "$pj" | jq -r '.result.pane.agent // empty')
[ "$pp" = "$SELF" ] || die 1 "self pane mismatch: asked $SELF, herdr returned '$pp'"
[ "$pw" = "$WS" ] || die 1 "workspace mismatch: self pane $SELF is in workspace '$pw', not '$WS'"
TJ='[]'
while IFS= read -r t; do
  aj=$(herdr agent get "$t" 2>/dev/null </dev/null) || die 1 "target not found: $t"
  printf '%s\n' "$aj" | jq -e '.result.agent | type == "object"' >/dev/null 2>&1 || die 1 "malformed 'herdr agent get $t' output"
  tw=$(printf '%s\n' "$aj" | jq -r '.result.agent.workspace_id // empty')
  tp=$(printf '%s\n' "$aj" | jq -r '.result.agent.pane_id // empty')
  [ -n "$tp" ] || die 1 "target $t has no pane_id"
  [ "$tw" = "$WS" ] || die 1 "target not in workspace: $t (workspace '$tw', expected '$WS')"
  [ "$tp" != "$SELF" ] || die 1 "target is self: $t ($SELF)"
  TJ=$(printf '%s\n' "$TJ" | jq -c --arg i "$t" --argjson a "$(printf '%s\n' "$aj" | jq -c '.result.agent')" \
    '. + [{input: $i, pane_id: $a.pane_id, name: ($a.name // null), agent: ($a.agent // null), agent_status: ($a.agent_status // null), workspace_id: $a.workspace_id}]') \
    || die 1 "jq failed building targets"
done < "$TF"
jq -n -c --arg src "$SRC" --arg ws "$WS" --arg me "$SELF" --arg ag "$SELF_AGENT" --argjson t "$TJ" \
  '{ok: true, source: $src, workspace_id: $ws, self_pane: $me, self_agent: (if $ag == "" then null else $ag end), targets: $t}'
