#!/bin/sh
# Label validation for gh-issues issue.sh: canonical names + exactly-one-FIT rule.
# Source it, then call validate_labels "<labels>".
# Exit 0 valid; exit 1 with message on stderr when invalid.
# Safe to execute directly (no-op).
validate_labels() {
  _labels=$1
  _canonical=" focus instant tuck frontend design "
  _fit=" focus instant tuck "
  _label_count=0
  _fit_count=0
  _oldifs=$IFS; IFS=,
  for _l in $_labels; do
    IFS=$_oldifs
    [ -n "$_l" ] || continue
    case "$_canonical" in
      *" $_l "*) _label_count=$((_label_count + 1));;
      *) echo "invalid label: $_l" >&2; return 1;;
    esac
    case "$_fit" in
      *" $_l "*) _fit_count=$((_fit_count + 1));;
    esac
  done
  IFS=$_oldifs
  [ "$_label_count" -ge 1 ] || { echo "at least one valid label required" >&2; return 1; }
  [ "$_fit_count" -eq 1 ] || { echo "exactly one FIT label required (focus, instant, or tuck), got $_fit_count" >&2; return 1; }
  return 0
}
:
