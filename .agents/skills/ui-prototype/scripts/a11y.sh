#!/bin/sh
# Usage: a11y.sh [--min N] [pages...]   (defaults: min 100, pages <repo>/dist/*.html)
# Serve dist/ over http, run Lighthouse accessibility (mobile + desktop) per page.
# stdout: "<page> <form-factor> <score>" plus failing audit ids. stderr: error.
# Exit 0 all scores >= min, 1 any score below min or tool failure, 2 usage.
set -u

die() { rc=$1; shift; echo "a11y.sh: $*" >&2; exit "$rc"; }
usage() { echo "usage: $0 [--min N] [pages...]" >&2; exit 2; }

HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../../../.." && pwd)
MIN=100
PAGES=""

while [ $# -gt 0 ]; do
  case "$1" in
    --min)
      [ $# -ge 2 ] || usage
      case "$2" in *[!0-9]*) die 2 "--min needs a number, got '$2'";; esac
      MIN=$2; shift 2;;
    -*) usage;;
    *)
      [ -n "$1" ] || die 2 "empty page arg"
      PAGES="$PAGES$1 "
      shift;;
  esac
done

if [ -z "$PAGES" ]; then
  for p in "$ROOT"/dist/*.html; do
    [ -e "$p" ] || continue
    PAGES="$PAGES$p "
  done
  [ -n "$PAGES" ] || die 1 "no pages: $ROOT/dist/*.html not found"
fi

command -v python3 >/dev/null 2>&1 || die 1 "python3 not found in PATH"
command -v npx >/dev/null 2>&1 || die 1 "npx not found in PATH"
command -v jq >/dev/null 2>&1 || die 1 "jq not found in PATH"

PORT=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])') || die 1 "no free port"
python3 -m http.server "$PORT" -d "$ROOT/dist" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null' EXIT INT TERM

tries=0
while ! python3 -c 'import socket,sys; s=socket.socket(); s.settimeout(1); s.connect(("127.0.0.1",int(sys.argv[1])))' "$PORT" 2>/dev/null; do
  tries=$((tries + 1))
  [ "$tries" -ge 25 ] && die 1 "local server did not start on port $PORT"
  sleep 0.2
done

OUTDIR=$(mktemp -d) || die 1 "mktemp failed"
trap 'kill "$SERVER_PID" 2>/dev/null; rm -rf "$OUTDIR"' EXIT INT TERM

fail=0
for p in $PAGES; do
  base=$(basename "$p" .html)
  [ -f "$ROOT/dist/$base.html" ] || { echo "a11y.sh: page not found: $p" >&2; fail=1; continue; }
  for form in mobile desktop; do
    rep="$OUTDIR/$base-$form.json"
    if [ "$form" = desktop ]; then
      formflag="--preset=desktop"
    else
      formflag="--form-factor=mobile"
    fi
    if ! npx -y lighthouse "http://127.0.0.1:$PORT/$base.html" \
        --only-categories=accessibility "$formflag" \
        --chrome-flags="--headless=new --no-sandbox" \
        --output=json --output-path="$rep" --quiet >/dev/null 2>&1; then
      echo "a11y.sh: lighthouse failed: $base ($form)" >&2
      fail=1
      continue
    fi
    score=$(jq -r '(.categories.accessibility.score // 0) * 100 | floor' "$rep") || {
      echo "a11y.sh: unreadable report: $base ($form)" >&2
      fail=1
      continue
    }
    echo "$base $form $score"
    jq -r '.categories.accessibility.auditRefs[] | select(.weight > 0) | .id' "$rep" | while IFS= read -r aid; do
      [ -n "$aid" ] || continue
      ascore=$(jq -r --arg a "$aid" '.audits[$a].score' "$rep")
      case "$ascore" in
        ""|"null") continue;;
        1|1.0) continue;;
        *) echo "  fail: $aid (score $ascore)";;
      esac
    done
    if [ "$score" -lt "$MIN" ]; then
      fail=1
    fi
  done
done

exit "$fail"
