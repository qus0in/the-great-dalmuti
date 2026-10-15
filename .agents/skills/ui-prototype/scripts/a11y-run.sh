#!/bin/sh
# Usage: a11y-run.sh <url> <label> <form-factor> <out-dir>
# Run one Lighthouse accessibility audit. First stdout line is always
# "<label> <form-factor> <score|ERROR>", followed by failing audit lines.
# Exit 0 ok, 1 infra/report failure, 2 usage.
set -u

die() { rc=$1; shift; echo "a11y-run.sh: $*" >&2; exit "$rc"; }
usage() { echo "usage: $0 <url> <label> <form-factor> <out-dir>" >&2; exit 2; }

[ $# -eq 4 ] || usage
URL=$1; LABEL=$2; FORM=$3; OUTDIR=$4
[ -n "$URL" ] && [ -n "$LABEL" ] && [ -n "$FORM" ] && [ -d "$OUTDIR" ] || usage
case "$FORM" in
  mobile) FORMFLAG="--form-factor=mobile";;
  desktop) FORMFLAG="--preset=desktop";;
  *) die 2 "form-factor must be mobile or desktop, got '$FORM'";;
esac
command -v npx >/dev/null 2>&1 || die 1 "npx not found in PATH"
command -v jq >/dev/null 2>&1 || die 1 "jq not found in PATH"

rep="$OUTDIR/$LABEL-$FORM.json"
if ! npx -y lighthouse "$URL" \
    --only-categories=accessibility "$FORMFLAG" \
    --chrome-flags="--headless=new --no-sandbox" \
    --output=json --output-path="$rep" --quiet >/dev/null 2>&1; then
  echo "$LABEL $FORM ERROR"
  echo "a11y-run.sh: lighthouse failed: $URL ($FORM)" >&2
  exit 1
fi
score=$(jq -r '(.categories.accessibility.score // 0) * 100 | floor' "$rep") || {
  echo "$LABEL $FORM ERROR"
  echo "a11y-run.sh: unreadable report: $URL ($FORM)" >&2
  exit 1
}
echo "$LABEL $FORM $score"
jq -r '.categories.accessibility.auditRefs[] | select(.weight > 0) | .id' "$rep" | while IFS= read -r aid; do
  [ -n "$aid" ] || continue
  ascore=$(jq -r --arg a "$aid" '.audits[$a].score' "$rep")
  case "$ascore" in
    ""|"null") continue;;
    1|1.0) continue;;
    *) echo "  fail: $aid (score $ascore)";;
  esac
done
exit 0
