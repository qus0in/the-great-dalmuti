import * as cards from './play-dom-cards.js';
import { renderHint } from './play-dom-hint.js';
import { renderSubstitution } from './play-dom-notice.js';
import { mapSeatToSlot, renderSeats } from './play-dom-seats.js';
export { mapSeatToSlot, renderSeats };
const PHASES = {
  waiting: '대기 중',
  playing: '진행 중',
  tribute: '조공 진행 중',
  finished: '라운드 종료',
};

function set(root, key, text) {
  const el = root.querySelector(`[data-play="${key}"]`);
  if (el) el.textContent = text;
}

function setOpt(root, key, text) {
  const el = root.querySelector(`[data-play="${key}"]`);
  if (el) el.hidden = !text;
  if (el && text) el.textContent = text;
}

function formatTribute(pub) {
  const rev = pub?.revolution;
  if (rev?.isRevolution) {
    return rev.isGreaterRevolution
      ? '대혁명 선언 (신분 역전·세금 면제)'
      : '혁명 선언 (세금 면제)';
  }
  const t = pub?.tribute;
  return t
    ? `세금 징수 완료 (대달무티 ↔ 대농노 ${t.greaterCount ?? 2}장, 소달무티 ↔ 소농노 ${t.lesserCount ?? 1}장)`
    : '';
}

function renderMeta(doc, pub, count) {
  const p = pub?.previousPlay;
  const prev = p?.count
    ? `이전 트릭: ${p.rank} ${cards.rankLabel(p.rank)} ${p.count}장 (덮임)`
    : '';
  setOpt(doc, 'previous-trick', prev);
  setOpt(doc, 'tribute', formatTribute(pub));
  const hasDeck = typeof pub?.discardCount === 'number';
  const deck = hasDeck
    ? `남은 덱 ${pub.deckCount ?? 0}장 · 버린 카드 ${pub.discardCount}장 · 총 ${pub.totalCards ?? 80}장`
    : '';
  setOpt(doc, 'deck-stat', deck);
  setOpt(doc, 'selection-hint', count > 0 ? `선택된 카드: ${count}장` : '');
}

function renderChrome(doc, pub, { mySeat, count }) {
  const phase = pub ? pub.phase : 'waiting';
  set(doc, 'round', PHASES[phase] || '진행 중');
  const last = pub ? pub.lastPlay : null;
  const banner = last
    ? `좌석 ${last.seat}: ${cards.rankLabel(last.rank)} ${last.count}장`
    : '새 트릭 시작';
  set(doc, 'banner', banner);
  renderMeta(doc, pub, count);
  set(doc, 'submit', count > 0 ? `카드 내기 (${count}장 선택)` : '카드 내기');
  const myTurn = pub?.phase === 'playing' && pub.currentTurnSeat === mySeat;
  for (const key of ['submit', 'pass']) {
    const btn = doc.querySelector(`[data-play="${key}"]`);
    if (btn) btn.disabled = !myTurn;
  }
}

export function renderPlay(doc, view = {}) {
  const { publicState = null, hand = [], selected = [], mySeat = 0 } = view;
  renderChrome(doc, publicState, { mySeat, count: selected.length });
  renderSeats(doc, publicState, mySeat);
  cards.renderTrickCards(doc, publicState ? publicState.lastPlay : null);
  cards.renderHandCards(doc, { hand, selected });
  renderHint(doc, view);
  renderSubstitution(doc, view);
}
export function showMessage(doc, text) {
  set(doc, 'message', text ?? '');
}

export function bindPlay(doc, { onToggle, onSubmit, onPass } = {}) {
  const cleanups = [];
  const on = (key, type, fn) => {
    const el = doc.querySelector(`[data-play="${key}"]`);
    if (!el) return;
    el.addEventListener(type, fn);
    cleanups.push(() => el.removeEventListener(type, fn));
  };
  const toggle = (e) => {
    const c = e?.target?.closest && e.target.closest('[data-play="card"]');
    if (c?.dataset?.cardId && onToggle) onToggle(c.dataset.cardId);
  };
  const onKey = (e) => (e.key === 'Enter' || e.key === ' ') && toggle(e);
  on('hand', 'click', toggle);
  on('hand', 'keydown', onKey);
  on('submit', 'click', () => onSubmit && onSubmit());
  on('pass', 'click', () => onPass && onPass());
  return () => cleanups.forEach((fn) => fn());
}
