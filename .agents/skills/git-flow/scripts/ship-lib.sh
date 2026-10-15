#!/bin/sh
shq() {
  _q=$1; _out="'"
  while :; do
    case "$_q" in
      *"'"*) _out="$_out${_q%%\'*}'\''"; _q=${_q#*\'};;
      *) break;;
    esac
  done
  printf "%s%s'" "$_out" "$_q"
}
run_git() {
  if [ "$DRY" -eq 1 ]; then
    printf '+ git'
    for _a in "$@"; do printf ' %s' "$(shq "$_a")"; done
    printf '\n'
  else
    git "$@"
  fi
}
run_gh() {
  if [ "$DRY" -eq 1 ]; then
    printf '+ gh'
    for _a in "$@"; do printf ' %s' "$(shq "$_a")"; done
    printf '\n'
  else
    gh "$@"
  fi
}
ship_parse_args() {
while [ $# -gt 0 ]; do
  case "$1" in
    --merge) MERGE=1; shift;;
    --dry-run) DRY=1; shift;;
    --body-file)
      [ $# -ge 2 ] && [ -n "$2" ] || { echo "usage: $0 <title> [body] [--body-file FILE] [--merge] [--dry-run]" >&2; exit 2; }
      case "$2" in -*) echo "usage: $0 <title> [body] [--body-file FILE] [--merge] [--dry-run]" >&2; exit 2;; esac
      BODYFILE=$2; shift 2;;
    --) shift;
      while [ $# -gt 0 ]; do
        if [ -z "$TITLE" ]; then TITLE=$1
        elif [ -z "$BODY" ]; then BODY=$1
        else echo "unexpected arg: $1" >&2; exit 2; fi
        shift
      done
      break;;
    --*|-*) echo "unknown option: $1" >&2; exit 2;;
    *)
      if [ -z "$TITLE" ]; then TITLE=$1
      elif [ -z "$BODY" ]; then BODY=$1
      else echo "unexpected arg: $1" >&2; exit 2; fi
      shift;;
  esac
done
[ -n "$TITLE" ] || { echo "usage: $0 <title> [body] [--body-file FILE] [--merge] [--dry-run]" >&2; exit 2; }
if [ -n "$BODYFILE" ]; then
  [ -z "$BODY" ] || { echo "use only one of body / --body-file" >&2; exit 2; }
  BODY=$(cat "$BODYFILE") || { echo "cannot read body file: $BODYFILE" >&2; exit 1; }
fi
}
