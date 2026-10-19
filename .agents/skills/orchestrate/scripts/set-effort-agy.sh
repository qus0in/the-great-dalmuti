#!/bin/sh
# agy helpers for set-effort.sh (sourced; expects die in caller).
effort_val() { case "$1" in low) echo 1;; medium) echo 2;; high) echo 3;; *) echo 0;; esac; }
parse_slider() {
  printf '%s\n' "$1" | awk '
    match($0, /[Ee]ffort[[:space:]]*[◂<][[:space:]]*(low|medium|high)[[:space:]]*[▸>]/) {
      s = substr($0, RSTART, RLENGTH); sub(/^[Ee]ffort[[:space:]]*[◂<][[:space:]]*/, "", s)
      sub(/[[:space:]]*[▸>].*$/, "", s); print tolower(s); exit
    }'
}
model_id_for() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's/[ _][ _]*/-/g' -e 's/[^a-z0-9.\-]/-/g' -e 's/--*/-/g' -e 's/^[-.]*//' -e 's/[-.]*$//'
}
model_id_alt() { printf '%s' "$1" | tr '.' '-'; }
is_invalid_model() { printf '%s\n' "$1" | grep -q 'Invalid model'; }
agy_do_slider() {
  spane=$1; slevel=$2
  herdr pane send-text "$spane" "/model" || die 1 "failed sending /model to $spane"
  herdr pane send-keys "$spane" enter || die 1 "failed sending enter to $spane"
  scr=$(herdr pane read "$spane" --source visible 2>/dev/null)
  sli=$(parse_slider "$scr")
  [ -n "$sli" ] || { herdr pane send-keys "$spane" esc >/dev/null 2>&1 || true; die 1 "unexpected screen for $spane: slider not found"; }
  cv=$(effort_val "$sli"); tv=$(effort_val "$slevel"); df=$((tv - cv)); st=0
  [ "$df" -gt 0 ] && { ar=right; st=$df; }; [ "$df" -lt 0 ] && { ar=left; st=$((-df)); }
  while [ "$st" -gt 0 ]; do
    herdr pane send-keys "$spane" "$ar" || { herdr pane send-keys "$spane" esc >/dev/null 2>&1 || true; die 1 "failed sending $ar to $spane"; }
    scr=$(herdr pane read "$spane" --source visible 2>/dev/null)
    sli=$(parse_slider "$scr")
    [ -n "$sli" ] || { herdr pane send-keys "$spane" esc >/dev/null 2>&1 || true; die 1 "unexpected screen after $ar"; }
    st=$((st - 1))
  done
  herdr pane send-keys "$spane" enter || { herdr pane send-keys "$spane" esc >/dev/null 2>&1 || true; die 1 "failed sending enter to $spane"; }
}
