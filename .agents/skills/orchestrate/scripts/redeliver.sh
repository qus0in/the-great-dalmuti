#!/bin/sh
# Usage: redeliver.sh <task> [--resend] [--unit UNIT]
# List callbacks with delivered=no|pending, or retry them via herdr with a long backoff
# (default ~3-4 min total). Each retry re-sends the original token so the verify step still
# matches; success appends delivered=yes, final failure appends delivered=no. Exit 0 always
# unless args are bad (2) or the log directory is unwritable (1).
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(git rev-parse --show-toplevel 2>/dev/null || (cd "$HERE/../../../.." && pwd))
die() { rc=$1; shift; echo "redeliver.sh: $*" >&2; exit "$rc"; }
usage() { die 2 "usage: $0 <task> [--resend] [--unit UNIT]"; }
TASK=; RESEND=0; ONLY=
while [ $# -gt 0 ]; do
  case "$1" in
    --resend) RESEND=1; shift;;
    --unit) [ $# -ge 2 ] || usage; ONLY=$2; shift 2;;
    --) shift; break;;
    -*) usage;;
    *) [ -z "$TASK" ] || usage; TASK=$1; shift;;
  esac
done
[ -n "$TASK" ] || usage
case "$TASK" in
  /*) TASK_DIR="$TASK";;
  tmp/*) TASK_DIR="$ROOT/$TASK";;
  *) [ -d "$ROOT/tmp/$TASK" ] && TASK_DIR="$ROOT/tmp/$TASK" || TASK_DIR="$TASK";;
esac
LOG="$TASK_DIR/callbacks.log"; STATE="$TASK_DIR/state.md"; DIAG="$TASK_DIR/redeliver.log"
[ -f "$LOG" ] || { echo "redeliver.sh: no callbacks in $TASK_DIR"; exit 0; }
command -v herdr >/dev/null 2>&1 || echo "herdr unavailable in retry environment (PATH=$PATH)" >> "$DIAG"
list() { grep -E "delivered=(no|pending)" "$LOG" 2>/dev/null | { [ -z "$ONLY" ] && cat || grep -F "unit=$ONLY "; } || true; }
latest() {
  awk -v only="$ONLY" '
    /delivered=(no|pending|yes)/ {
      u="?"; d="?"
      for (i=1; i<=NF; i++) {
        if ($i ~ /^unit=/) u=substr($i, 6)
        else if ($i ~ /^delivered=/) d=substr($i, 11)
      }
      if (u != "?") { last[u]=$0; ldel[u]=d }
    }
    END { for (u in last) if ((ldel[u]=="no" || ldel[u]=="pending") && (only=="" || u==only)) print last[u] }
  ' "$LOG"
}
if [ "$RESEND" -eq 0 ]; then
  OUT=$(list); [ -n "$OUT" ] || { echo "(no pending callbacks)"; exit 0; }
  printf '%s\n' "$OUT"
  exit 0
fi
BACKS=${REDELIVER_BACKOFFS-"10 30 60 120"}; LIM=${REDELIVER_VERIFY_TRIES:-3}; SLP=${REDELIVER_VERIFY_SLEEP:-0.3}
latest | while IFS= read -r line; do
  [ -n "$line" ] || continue
  case "$line" in *token=*\ *target=*|*target=*\ *token=*) ;; *) echo "skip (no token/target): $line" >&2; continue;; esac
  tgt=$(printf '%s' "$line" | sed -n 's/.*target=\([^ ]*\).*/\1/p')
  tok=$(printf '%s' "$line" | sed -n 's/.*token=\([^ ]*\).*/\1/p')
  wrk=$(printf '%s' "$line" | sed -n 's/.*worker=\([^ ]*\).*/\1/p')
  unt=$(printf '%s' "$line" | sed -n 's/.*unit=\([^ ]*\).*/\1/p')
  st=$(printf '%s' "$line" | sed -n 's/.*status=\([^ ]*\).*/\1/p')
  rep=$(printf '%s' "$line" | sed -n 's/.*report=\([^ ]*\).*/\1/p')
  msg=$(printf '%s' "$line" | sed -n 's/.*msg="\(.*\)".*/\1/p')
  [ -n "$tgt" ] && [ -n "$tok" ] && [ -n "$unt" ] && [ -n "$rep" ] || { echo "skip (unparseable): $line" >&2; continue; }
  body="[callback] token=$tok worker=$wrk unit=$unt status=$st report=$rep"
  [ -z "$msg" ] || body="$body msg=\"$msg\""
  sent=0
  for d in 0 $BACKS; do
    [ "$d" -eq 0 ] || sleep "$d"
    if command -v herdr >/dev/null 2>&1 && herdr agent prompt "$tgt" "$body" >/dev/null 2>>"$DIAG"; then
      n=0
      while [ "$n" -lt "$LIM" ]; do
        if herdr pane read "$tgt" --source visible 2>>"$DIAG" | grep -Fq "$tok"; then sent=1; break 2; fi
        [ "$SLP" = "0" ] || sleep "$SLP"
        n=$((n + 1))
      done
    fi
  done
  TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  if [ "$sent" -eq 1 ]; then
    printf '[%s] worker=%s unit=%s status=%s report=%s target=%s token=%s delivered=yes%s\n' "$TS" "$wrk" "$unt" "$st" "$rep" "$tgt" "$tok" "${msg:+ msg=\"$msg\"}" >> "$LOG" 2>/dev/null || die 1 "cannot write $LOG"
    printf '%s callback %s %s %s report=%s target=%s token=%s delivered=yes%s\n' "$TS" "$st" "$wrk" "$unt" "$rep" "$tgt" "$tok" "${msg:+ msg=\"$msg\"}" >> "$STATE" 2>/dev/null || true
    echo "redelivered $unt to $tgt"
  else
    printf '[%s] worker=%s unit=%s status=%s report=%s target=%s token=%s delivered=no%s\n' "$TS" "$wrk" "$unt" "$st" "$rep" "$tgt" "$tok" "${msg:+ msg=\"$msg\"}" >> "$LOG" 2>/dev/null || die 1 "cannot write $LOG"
    printf '%s callback %s %s %s report=%s target=%s token=%s delivered=no%s\n' "$TS" "$st" "$wrk" "$unt" "$rep" "$tgt" "$tok" "${msg:+ msg=\"$msg\"}" >> "$STATE" 2>/dev/null || true
    echo "redeliver failed for $unt (logged delivered=no)" >&2
  fi
done
exit 0
