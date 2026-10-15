#!/bin/sh
# Validate context and scope all targets within workspace without unquoted expansion
build_and_run_context() {
  ws_val=$1; self_val=$2; ws_set=$3; self_set=$4; shift 4
  count=$#; k=0
  while [ "$k" -lt "$count" ]; do
    t=$1; shift
    set -- "$@" --target "$t"
    k=$((k + 1))
  done
  if [ "$ws_set" -eq 1 ] || [ "$self_set" -eq 1 ]; then
    [ "$ws_set" -eq 1 ] && set -- --workspace "$ws_val" "$@"
    [ "$self_set" -eq 1 ] && set -- --self-pane "$self_val" "$@"
  fi
  "$HERE/context.sh" "$@"
}
