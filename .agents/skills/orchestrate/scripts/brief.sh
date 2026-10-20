#!/bin/sh
# Usage: brief.sh <kind> <task> <worker> [key=value...]
# kind: review | deploy | pr-body. Renders scripts/brief-templates/<kind>.md ({{key}}
# placeholders) into tmp/<task>/brief-<worker>-<kind>[-<unit>].md and appends the common
# report tail. Existing brief -> refuse (exit 1). Missing/unknown key -> exit 2.
# Required keys: review=unit author author_brief report snapshot criteria;
# deploy=pr merge version paths; pr-body=version closes sources since.
# "unit" is required for review, optional elsewhere; it adds the filename suffix.
# The worker report path is derived per kind: review -> review-<worker>[-<unit>].md,
# others -> report-<worker>-<kind>[-<unit>].md (all under tmp/<task>/).
set -u
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../../../.." && pwd)
usage() { echo "usage: $0 <kind> <task> <worker> [key=value...]" >&2; exit 2; }
[ $# -ge 3 ] || usage
KIND=$1; TASK=$2; WORKER=$3; shift 3
case "$KIND" in review|deploy|pr-body) ;; *) echo "brief.sh: unknown kind: $KIND" >&2; exit 2;; esac
case "$TASK" in ''|/*|*/*|.*) echo "brief.sh: invalid task: $TASK" >&2; exit 2;; esac
case "$WORKER" in ''|/*|*/*) echo "brief.sh: invalid worker: $WORKER" >&2; exit 2;; esac
case "$KIND" in
  review) REQ="unit author author_brief report snapshot criteria";;
  deploy) REQ="pr merge version paths";;
  pr-body) REQ="version closes sources since";;
esac
TMPD=$(mktemp -d) || exit 2
trap 'rm -rf "$TMPD"' EXIT INT TERM
KV="$TMPD/kv"
for a in "$@"; do
  case "$a" in
    *=*) k=${a%%=*}; v=${a#*=};;
    *) echo "brief.sh: bad argument (want key=value): $a" >&2; exit 2;;
  esac
  [ -n "$k" ] || { echo "brief.sh: empty key" >&2; exit 2; }
  printf '%s\t%s\n' "$k" "$v" >> "$KV"
done
miss=$(awk -F'\t' -v r="$REQ" 'BEGIN{n=split(r,a," ");for(i=1;i<=n;i++)w[a[i]]=1} $1 in w{s[$1]=1} END{o="";for(k in w)if(!(k in s))o=o (o==""?"":", ") k;print o}' "$KV")
[ -z "$miss" ] || { echo "brief.sh: missing key(s): $miss (kind=$KIND)" >&2; exit 2; }
unk=$(awk -F'\t' -v r="$REQ" 'BEGIN{n=split(r,a," ");for(i=1;i<=n;i++)w[a[i]]=1;w["unit"]=1} !($1 in w){print $1}' "$KV")
[ -z "$unk" ] || { echo "brief.sh: unknown key(s): $unk (kind=$KIND)" >&2; exit 2; }
val() { awk -F'\t' -v k="$1" '$1==k{print substr($0,index($0,"\t")+1);exit}' "$KV"; }
ticks() { printf '%s' "$1" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$' | awk 'BEGIN{f=1}{if(!f)printf ", ";printf "`%s`",$0;f=0}'; }
closes() { printf '%s' "$1" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$' | awk 'BEGIN{f=1}{gsub(/^#/,"",$0);if(!f)printf ", ";printf "%s#%s",(f?"Closes ":"closes "),$0;f=0}'; }
UNIT=$(val unit); SUF=""
if [ -n "$UNIT" ]; then
  SAFE=$(printf '%s' "$UNIT" | tr -c 'A-Za-z0-9._-' '-' | sed 's/^[-.]*//;s/[-.]*$//')
  [ -n "$SAFE" ] || { echo "brief.sh: invalid unit: $UNIT" >&2; exit 2; }
  SUF="-$SAFE"
fi
TD="$ROOT/tmp/$TASK"; mkdir -p "$TD" || exit 2
OUT="$TD/brief-$WORKER-$KIND$SUF.md"
[ -e "$OUT" ] && { echo "brief.sh: refusing to overwrite: $OUT" >&2; exit 1; }
case "$KIND" in
  review) REPORT="tmp/$TASK/review-$WORKER$SUF.md";;
  *) REPORT="tmp/$TASK/report-$WORKER-$KIND$SUF.md";;
esac
[ "$KIND" = deploy ] && printf 'paths\t%s\n' "$(ticks "$(val paths)")" >> "$KV"
if [ "$KIND" = pr-body ]; then
  printf 'closes\t%s\n' "$(closes "$(val closes)")" >> "$KV"
  printf 'sources\t%s\n' "$(ticks "$(val sources)")" >> "$KV"
fi
cat "$HERE/brief-templates/$KIND.md" > "$TMPD/brief" || exit 2
cat >> "$TMPD/brief" << 'TAIL'

## 보고
`{{report_path}}` — STAR(상황·과제·행동·결과)로 쓰고 첫머리 요약 블록으로 시작한다.

요약 블록(첫머리, 이 순서):
- `status: done|blocked|failed|in-progress` (첫 줄)
- `verdict: accept|block` (리뷰만)
- `blocking: <차단 건수>`
- `summary: <3줄 이내 요약>` (이어지는 줄은 들여쓰기)
TAIL
awk -v kv="$KV" -v task="$TASK" -v worker="$WORKER" -v kind="$KIND" -v rp="$REPORT" '
BEGIN { FS = "\t"
  while ((getline l < kv) > 0) { p = index(l, "\t"); if (p > 0) v[substr(l, 1, p-1)] = substr(l, p+1) }
  v["task"] = task; v["worker"] = worker; v["kind"] = kind; v["report_path"] = rp }
{ line = $0
  for (k in v) { ph = "{{" k "}}"; o = ""
    while ((q = index(line, ph)) > 0) { o = o substr(line, 1, q-1) v[k]; line = substr(line, q+length(ph)) }
    line = o line }
  print line }' "$TMPD/brief" > "$TMPD/out" || exit 2
if grep -q '{{' "$TMPD/out"; then
  echo "brief.sh: unresolved placeholder (template/key mismatch)" >&2
  exit 2
fi
mv "$TMPD/out" "$OUT" || exit 2
echo "brief: tmp/$TASK/brief-$WORKER-$KIND$SUF.md"
