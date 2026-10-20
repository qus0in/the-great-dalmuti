#!/bin/sh
# test-ship.sh: empty-tree guard (1) same tree -> exit 0 no push/gh (2) diff -> dry-run proceeds.
set -u
S=$(cd "$(dirname "$0")" && pwd)
TMP=$(mktemp -d) || exit 1
trap 'rm -rf "$TMP"' EXIT INT TERM
ORIGIN="$TMP/origin.git"
ROOT="$TMP/root"
BIN="$TMP/bin"
GHLOG="$TMP/gh.log"
export GHLOG
git init --bare -q "$ORIGIN" || exit 1
mkdir -p "$ROOT/.agents/skills/git-flow/scripts" "$BIN" || exit 1
cp "$S/ship.sh" "$S/ship-lib.sh" "$ROOT/.agents/skills/git-flow/scripts/" || exit 1
chmod +x "$ROOT/.agents/skills/git-flow/scripts/ship.sh"
cat >"$BIN/gh" <<'EOS'
#!/bin/sh
echo "$*" >> "$GHLOG"
exit 0
EOS
chmod +x "$BIN/gh"
PATH="$BIN:$PATH"; export PATH
: >"$GHLOG"
cd "$ROOT" || exit 1
git init -q || exit 1
git config user.email t@t.t || exit 1
git config user.name t || exit 1
git checkout -q -b main || exit 1
git remote add origin "$ORIGIN" || exit 1
echo a >f || exit 1
git add -A || exit 1
git commit -qm init || exit 1
git push -q -u origin main || exit 1
git checkout -q -b dev || exit 1
git push -q -u origin dev || exit 1
: >"$GHLOG"
SHIP="$ROOT/.agents/skills/git-flow/scripts/ship.sh"
if ! "$SHIP" t --dry-run >"$TMP/o1" 2>"$TMP/e1"; then
  echo "case1: exit nonzero"; cat "$TMP/e1"; exit 1
fi
grep -q "nothing to ship: dev tree equals origin/main" "$TMP/e1" || {
  echo "case1: missing guard msg"; cat "$TMP/e1"; exit 1
}
if grep -q "+ git.*push" "$TMP/o1"; then
  echo "case1: unexpected push"; cat "$TMP/o1"; exit 1
fi
if [ -s "$GHLOG" ]; then
  echo "case1: unexpected gh call"; cat "$GHLOG"; exit 1
fi
echo b >>f || exit 1
git commit -qam ch || exit 1
: >"$GHLOG"
if ! "$SHIP" t --dry-run >"$TMP/o2" 2>"$TMP/e2"; then
  echo "case2: exit nonzero"; cat "$TMP/e2"; exit 1
fi
grep -q "+ git.*push" "$TMP/o2" || {
  echo "case2: missing push line"; cat "$TMP/o2"; exit 1
}
grep -q "+ gh.*pr.*create" "$TMP/o2" || {
  echo "case2: missing pr create line"; cat "$TMP/o2"; exit 1
}
grep -q "pr list" "$GHLOG" || {
  echo "case2: missing pr lookup"; cat "$GHLOG"; exit 1
}
echo "test-ship: PASS"
