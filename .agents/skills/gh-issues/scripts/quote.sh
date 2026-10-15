#!/bin/sh
# Shell quoting and command formatting helper for gh-issues scripts.
shq() {
  case "$1" in
    ''|*[!A-Za-z0-9_.:/=+-]*)
      _q=$1; _out="'"
      while :; do
        case "$_q" in
          *"'"*) _out="$_out${_q%%\'*}'\\''"; _q=${_q#*\'};;
          *) break;;
        esac
      done
      printf "%s%s'" "$_out" "$_q"
      ;;
    *)
      printf '%s' "$1"
      ;;
  esac
}

format_cmd() {
  _first=1
  for _a in "$@"; do
    if [ "$_first" -eq 1 ]; then
      shq "$_a"
      _first=0
    else
      printf ' '
      shq "$_a"
    fi
  done
  printf '\n'
}

print_cmd() {
  printf '+ '
  format_cmd "$@"
}

run_or_dry() {
  if [ "${DRY:-0}" -eq 1 ]; then
    print_cmd "$@"
  else
    "$@" || exit $?
  fi
}
