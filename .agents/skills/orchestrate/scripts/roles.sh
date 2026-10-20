#!/bin/sh
# Usage: roles.sh list [--workspace ID] | resolve <label-or-pane> [--workspace ID] | label <pane-id>
# Resolve Herdr tab labels (o, r, w1-w3) to live panes of one workspace.
# list/resolve: workspace defaults to context.sh; when that fails, --workspace is required.
# resolve: wNN:pX input passes through verbatim; unknown label -> exit 1. label: prints the pane's
# tab label, or an empty line (exit 0). Test inject: ROLES_HERDR_JSON=<file> replays
# {"tab list": <herdr tab list stdout>, "pane list": <herdr pane list stdout>}.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
die() { echo "roles.sh: $1" >&2; exit "$2"; }
usage() { echo "usage: roles.sh list [--workspace ID] | resolve <label-or-pane> [--workspace ID] | label <pane-id>" >&2; exit 2; }
ENVU() { env -u HERDR_WORKSPACE_ID -u HERDR_TAB_ID -u HERDR_PANE_ID "$@"; }

[ $# -ge 1 ] || usage
case "$1" in list|resolve|label) CMD=$1; shift;; *) usage;; esac

WS=; ARG=
while [ $# -gt 0 ]; do
  case "$1" in
    --workspace) [ $# -ge 2 ] || usage; WS=$2; shift 2;;
    -*) usage;;
    *) case "$CMD" in list) usage;; *) [ -z "$ARG" ] || usage; ARG=$1;; esac; shift;;
  esac
done
case "$CMD" in
  list) [ -z "$ARG" ] || usage;;
  resolve|label) [ -n "$ARG" ] || usage;;
esac
[ -z "${ROLES_HERDR_JSON:-}" ] || [ -r "$ROLES_HERDR_JSON" ] || die "ROLES_HERDR_JSON not readable: '$ROLES_HERDR_JSON'" 2
HJ() {
  if [ -n "${ROLES_HERDR_JSON:-}" ]; then
    jq -c --arg c "$*" '.[$c]' "$ROLES_HERDR_JSON"
  else
    command -v herdr >/dev/null 2>&1 || die "herdr not found in PATH and ROLES_HERDR_JSON unset" 2
    ENVU herdr "$@" 2>/dev/null
  fi
}
vjson() { # $1: payload $2: herdr cmd $3: jq program
  printf '%s\n' "$1" | jq -e "$3" >/dev/null 2>&1 || die "malformed 'herdr $2' output" 1
}
fetch() { # $1: 'tab list' | 'pane list' -> validated payload on stdout
  p=$(HJ "${1% *}" "${1#* }") || { echo "roles.sh: 'herdr $1' failed" >&2; exit 1; }
  case "$1" in
    'tab list') pg='.result.tabs | type=="array" and all(.[]; type=="object" and (.tab_id|type=="string" and .!="") and (.workspace_id|type=="string" and .!="") and ((.label|type=="string") or .label==null) and ((.pane_count|type=="number") or .pane_count==null))';;
    *) pg='.result.panes | type=="array" and all(.[]; type=="object" and (.pane_id|type=="string" and .!="") and (.tab_id|type=="string" and .!="") and (.workspace_id|type=="string" and .!="") and ((.agent|type=="string") or .agent==null) and ((.agent_status|type=="string") or .agent_status==null))';;
  esac
  vjson "$p" "$1" "$pg" && echo "$p"
}
getws() {
  if [ -n "$WS" ]; then
    case "$WS" in -*|*[!A-Za-z0-9:._-]*) die "invalid --workspace: '$WS'" 2;; esac
    return 0
  fi
  [ -z "${ROLES_HERDR_JSON:-}" ] || die "--workspace required: context.sh is unavailable under ROLES_HERDR_JSON injection" 2
  ctx=$("$HERE/context.sh") || die "--workspace required: context.sh failed to resolve workspace" 2
  WS=$(printf '%s\n' "$ctx" | jq -r '.workspace_id // empty')
  [ -n "$WS" ] || die "--workspace required: context.sh failed to resolve workspace" 2
}
emit_rows() { # $1: workspace -> label pane agent status pane_count TSV rows
  tj=$(fetch 'tab list') || { echo "roles.sh: 'herdr tab list' failed" >&2; exit 1; }
  pj=$(fetch 'pane list') || { echo "roles.sh: 'herdr pane list' failed" >&2; exit 1; }
  printf '%s\n' "$tj" "$pj" | jq -rsc --arg ws "$1" '
    [ .[0].result.tabs[] | select(.workspace_id == $ws and (.label // "") != "") ] as $lt
    | [ .[1].result.panes[] | select(.workspace_id == $ws) ] as $lp
    | $lt[] as $t | [ $lp[] | select(.tab_id == $t.tab_id) ] as $ps
    | if ($ps | length) == 0 then empty else
      [ $t.label, $ps[0].pane_id, ($ps[0].agent // "-"), ($ps[0].agent_status // "-"), ($t.pane_count // 1) ] | @tsv end
  ' || { echo "roles.sh: jq join failed for workspace $1" >&2; exit 1; }
}
case "$CMD" in
  list)
    getws
    rows=$(emit_rows "$WS") || { echo "roles.sh: 'herdr tab list'/'pane list' failed" >&2; exit 1; }
    printf '%s\n' "$rows" | while IFS="$(printf '\t')" read -r lb pane ag st pc; do
      [ -n "$lb" ] || continue
      case "$pc" in ''|*[!0-9]*) pc=1;; esac
      [ "$pc" -le 1 ] || echo "roles.sh: tab '$lb' has $pc panes; using the first pane" >&2
      printf '%s %s %s %s\n' "$lb" "$pane" "$ag" "$st"
    done
    ;;
  resolve)
    case "$ARG" in w[0-9][0-9]*:p[A-Za-z0-9]*) printf '%s\n' "$ARG"; exit 0;; esac
    getws
    rows=$(emit_rows "$WS") || { echo "roles.sh: 'herdr tab list'/'pane list' failed" >&2; exit 1; }
    out=$(printf '%s\n' "$rows" | awk -F'\t' -v x="$ARG" '$1 == x { print $2; exit }')
    [ -n "$out" ] || die "no labeled tab '$ARG' in workspace $WS" 1
    printf '%s\n' "$out"
    ;;
  label)
    case "$ARG" in w[0-9][0-9]*:p[A-Za-z0-9]*) ;; *) die "bad pane id '$ARG' (expected wNN:pX)" 2;; esac
    pj=$(fetch 'pane list') || { echo "roles.sh: 'herdr pane list' failed" >&2; exit 1; }
    tj=$(fetch 'tab list') || { echo "roles.sh: 'herdr tab list' failed" >&2; exit 1; }
    lab=$(printf '%s\n' "$pj" "$tj" | jq -rsc --arg p "$ARG" '
      [ .[0].result.panes[] | select(.pane_id == $p) ] as $ps | $ps[0].tab_id as $t
      | if $t == null then "" else ([ .[1].result.tabs[] | select(.tab_id == $t) ] | .[0].label // "") end
    ') || { echo "roles.sh: jq label lookup failed" >&2; exit 1; }
    printf '%s\n' "$lab"
    ;;
esac
