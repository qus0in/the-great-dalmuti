#!/bin/sh
milestone_parse_args() {
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY=1; shift;;
    --)
      shift
      while [ $# -gt 0 ]; do
        if [ -z "$TITLE" ]; then TITLE=$1
        elif [ "$DESC_SET" -eq 0 ]; then DESC=$1; DESC_SET=1
        else echo "unexpected arg: $1" >&2; exit 2; fi
        shift
      done
      break;;
    --*)
      echo "unknown option: $1" >&2; exit 2;;
    *)
      if [ -z "$TITLE" ]; then TITLE=$1
      elif [ "$DESC_SET" -eq 0 ]; then DESC=$1; DESC_SET=1
      else echo "unexpected arg: $1" >&2; exit 2; fi
      shift;;
  esac
done
}
