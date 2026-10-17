#!/bin/sh
# Usage: ledger.sh [--migrate]
# Ensure the rolling harness ledger (single file under tmp/) and optionally migrate earlier
# per-day signal rows into it with date-prefixed IDs.
# --migrate: append rows from per-day harness signal files as YYYYMMDD-Sn; IDs already in the
# target are skipped; source files are never modified. Exit 0; 2 usage.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
LEDGER=harness-ledger.md
FILE="$ROOT/tmp/$LEDGER"
MODE=ensure
case "${1:-}" in --migrate) MODE=migrate;; '') ;; *) echo "usage: $0 [--migrate]" >&2; exit 2;; esac

if [ ! -f "$FILE" ]; then
  mkdir -p "$ROOT/tmp"
  cat > "$FILE" <<'EOF'
# harness ledger
- Rolling single ledger (one file, no per-day dirs). Append-only: never delete a row; set status.
- ID: YYYYMMDD-Sn (date first recorded). Status vocabulary: open | noted | done.
- Each row: source + quote, gap, proposed target (docs/skill/script/AGENTS).

| id | source + quote | gap | target | status |
| --- | --- | --- | --- | --- |
EOF
fi

if [ "$MODE" = migrate ]; then
  N=0; SKIP=0; PREFIX=harness-
  for src in "$ROOT/tmp/$PREFIX"*/signals.md; do
    [ -f "$src" ] || continue
    d=$(basename "$(dirname "$src")"); p=$(printf '%s' "${d#harness-}" | tr -d '-')
    rows=$(awk -v p="$p" '
      function trim(s){gsub(/^[ \t]+/,"",s);gsub(/[ \t]+$/,"",s);return s}
      function mapst(s){s=tolower(trim(s))
        if (s ~ /^open/) return "open"
        if (s ~ /^noted/) return "noted"
        if (s ~ /^no-change/) return "noted (was no-change)"
        if (s ~ /^완료/) return "done"
        if (s ~ /^done/) {if (s ~ /(대기|pending)/) return "open (was done 결정, 단위 대기)"; return "done"}
        if (s ~ /(후보|pending|대기|필요|미결)/) return "open"
        return "noted"}
      function emit(id,s,g,t,k){if(id=="")return
        if(!(id in seen)){seen[id]=1;order[++n]=id}
        if(s!="")src_[id]=s
        if(g!="")gap_[id]=g
        if(t!="")tgt_[id]=t
        if(k!="")st_[id]=k}
      {
        l=$0
        if (l ~ /^[ \t]*-[ \t]*S[0-9]+[ \t]*후속/) {
          rest=l; sub(/^.*후속[ \t]*:?[ \t]*/,"",rest)
          if (last!="") src_[last]=src_[last] " / 후속: " trim(rest)
          next}
        if (l ~ /^[ \t]*-[ \t]*S[0-9]+(·S[0-9]+)*:/) {
          rest=l; sub(/^[ \t]*-[ \t]*/,"",rest)
          ids=substr(rest,1,index(rest,":")-1)
          stt=mapst(substr(rest,index(rest,":")+1))
          m=split(ids,A,/·/); last=trim(A[1])
          for(i=1;i<=m;i++){id=trim(A[i]); emit(id,"","","",stt)}
          next}
        if (l ~ /^[ \t]*\|[ \t]*S[0-9]+[ \t]*\|/) {
          nf=split(l,f,"|"); tgt=f[5]
          for(i=6;i<=nf-2;i++) tgt=tgt "|" f[i]
          emit(trim(f[2]),trim(f[3]),trim(f[4]),trim(tgt),mapst(f[nf-1]))
          last=trim(f[2]); next}
        if (l ~ /^[ \t]*-[ \t]*S[0-9]+/) {
          rest=l; sub(/^[ \t]*-[ \t]*/,"",rest)
          match(rest,/^S[0-9]+/); id=substr(rest,1,RLENGTH); last=id
          emit(id,trim(substr(rest,RLENGTH+1)),"—","—",mapst(substr(rest,RLENGTH+1)))
          next}
      }
      END{for(i=1;i<=n;i++){id=order[i]
        if(src_[id]=="")src_[id]="(status line)"
        if(gap_[id]=="")gap_[id]="—"
        if(tgt_[id]=="")tgt_[id]="—"
        printf "%s-%s\t| %s-%s | %s | %s | %s | %s |\n",p,id,p,id,src_[id],gap_[id],tgt_[id],st_[id]}}
    ' "$src")
    while IFS="$(printf '\t')" read -r rid row; do
      [ -n "$rid" ] || continue
      if grep -qF "| $rid |" "$FILE"; then SKIP=$((SKIP+1)); else printf '%s\n' "$row" >> "$FILE"; N=$((N+1)); fi
    done <<EOF
$rows
EOF
  done
  echo "migrated $N rows, skipped $SKIP existing"
fi
echo "$FILE"
