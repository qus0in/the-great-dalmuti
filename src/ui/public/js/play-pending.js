const TEXT = { submit: '내는 중…', pass: '넘기는 중…' };
const SPIN = 'play-pending__spinner';
const BUSY = 'is-pending';
function query(doc, key) {
  return doc.querySelector(`[data-play="${key}"]`);
}
function hasCls(name, cls) {
  return String(name).indexOf(cls) !== -1;
}
function markKey(doc, key) {
  const node = query(doc, key);
  if (!node) return;
  if (node.classList?.add) node.classList.add(BUSY);
  else if (!hasCls(node.className, BUSY)) node.className += ` ${BUSY}`;
}
function unmarkKey(doc, key) {
  const node = query(doc, key);
  if (!node) return;
  if (node.classList?.remove) node.classList.remove(BUSY);
  else node.className = String(node.className).replace(BUSY, '').trim();
}
export function isPending(doc) {
  const tray = query(doc, 'hand');
  if (!tray) return false;
  if (typeof tray.getAttribute !== 'function')
    return tray.attrs?.['aria-busy'] === 'true';
  return tray.getAttribute('aria-busy') === 'true';
}
export function pendingKind(doc) {
  const tray = query(doc, 'hand');
  if (!tray) return null;
  return tray.dataset.pendingKind ?? null;
}
export function startPending(doc, kind = 'submit') {
  if (isPending(doc)) return false;
  const submit = query(doc, 'submit');
  const pass = query(doc, 'pass');
  const tray = query(doc, 'hand');
  if (!submit || !pass || !tray) return false;
  for (const node of [submit, pass]) {
    node.dataset.pendingDisabled = node.disabled ? '1' : '';
    node.dataset.pendingText = node.textContent;
    node.disabled = true;
  }
  const key = kind === 'pass' ? 'pass' : 'submit';
  const target = key === 'pass' ? pass : submit;
  target.textContent = TEXT[key];
  markKey(doc, key);
  const spin = doc.createElement('span');
  spin.className = SPIN;
  spin.setAttribute('aria-hidden', 'true');
  target.appendChild(spin);
  tray.dataset.pendingKind = kind;
  tray.setAttribute('aria-busy', 'true');
  markKey(doc, 'hand');
  return true;
}
function restoreOne(doc, key) {
  const node = query(doc, key);
  if (!node) return;
  const spin = node.querySelector(`.${SPIN}`);
  if (spin?.remove) spin.remove();
  if (node.children?.filter)
    node.children = node.children.filter(
      (child) => !hasCls(child.className, SPIN),
    );
  if (node.dataset.pendingText !== undefined)
    node.textContent = node.dataset.pendingText;
  delete node.dataset.pendingText;
  node.disabled = node.dataset.pendingDisabled === '1';
  delete node.dataset.pendingDisabled;
  unmarkKey(doc, key);
}
function clearTray(doc) {
  const tray = query(doc, 'hand');
  if (!tray) return;
  tray.removeAttribute('aria-busy');
  delete tray.dataset.pendingKind;
  unmarkKey(doc, 'hand');
}
export function stopPending(doc) {
  const tray = query(doc, 'hand');
  if (!isPending(doc) && !tray?.dataset?.pendingKind) return;
  restoreOne(doc, 'submit');
  restoreOne(doc, 'pass');
  clearTray(doc);
}
