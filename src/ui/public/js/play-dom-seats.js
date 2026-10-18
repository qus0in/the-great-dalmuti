import { renderAvatar, resolveSeatAvatar, mountAvatar } from './avatar.js';

const SEAT_TITLES = ',1위 대달무티,2위 소달무티,3위 소농노,4위 대농노'.split(
  ',',
);
const RANK_SEL = '[data-play="seat-rank"], .seat__name-row .badge';
const STATUS_SEL =
  '[data-play="seat-status"], .seat__status, .badge--turn, .badge--pass';
const STATUS_MAP = {
  fin: ['', 'seat__status'],
  turn: ['차례(Turn)', 'badge badge--turn'],
  pass: ['패스(Pass)', 'badge badge--pass'],
  idle: ['대기 중', 'seat__status'],
};

export const mapSeatToSlot = (seat, mySeat = 0) => (seat - mySeat + 6) % 4;

function setText(root, sel, txt) {
  const el = root.querySelector(sel);
  if (el) el.textContent = txt;
}

function updateSeatRank(root, item) {
  const el = root.querySelector(RANK_SEL);
  if (!el) return;
  const txt = item.rank
    ? String(item.rank)
    : SEAT_TITLES[item.finishPosition] || '';
  el.hidden = !txt;
  el.textContent = txt;
}

function updateSeatStatus(root, { isFinished, isTurn, isPassed }) {
  const el = root.querySelector(STATUS_SEL);
  if (!el) return;
  el.hidden = Boolean(isFinished);
  const key = isFinished ? 'fin' : isTurn ? 'turn' : isPassed ? 'pass' : 'idle';
  [el.textContent, el.className] = STATUS_MAP[key];
}

const seatClassName = (slot, { isTurn, isPassed }) => {
  const base = slot === 2 ? 'seat seat--me' : 'seat';
  return isTurn ? `${base} is-turn` : isPassed ? `${base} is-passed` : base;
};

function resetSeatSlots(doc, isFinished) {
  for (let slot = 0; slot < 4; slot += 1) {
    const el = doc.querySelector(`[data-play="seat"][data-seat="${slot}"]`);
    if (el) {
      el.className = slot === 2 ? 'seat seat--me' : 'seat';
      updateSeatRank(el, {});
      updateSeatStatus(el, { isFinished, isTurn: false, isPassed: false });
    }
  }
}

function updateSeatSlot(doc, item, flags) {
  const el = doc.querySelector(`[data-play="seat"][data-seat="${flags.slot}"]`);
  if (!el) return;
  el.className = seatClassName(flags.slot, flags);
  mountAvatar(
    el.querySelector('.seat__avatar'),
    renderAvatar(doc, resolveSeatAvatar(item, flags.ctx)),
  );
  setText(el, '.seat__name, .play-hand-header__title', item.userName || '');
  setText(el, '.seat__count', `${item.cardCount || 0}장`);
  updateSeatRank(el, item);
  updateSeatStatus(el, flags);
}

function buildSeatFlags(pub, item, { mySeat, ctx }) {
  const isTurn = Boolean(
    pub && pub.phase === 'playing' && item.seat === pub.currentTurnSeat,
  );
  const isPassed = Boolean(
    pub && pub.phase === 'playing' && !isTurn && item.passed,
  );
  return {
    slot: mapSeatToSlot(item.seat, mySeat),
    isFinished: Boolean(pub && pub.phase === 'finished'),
    isTurn,
    isPassed,
    ctx,
  };
}

function toContext(pub, opt) {
  if (typeof opt === 'number') return { mySeat: opt, ctx: pub };
  if (opt instanceof Set) return { mySeat: 0, ctx: { hiddenIds: opt } };
  return { mySeat: (opt && opt.mySeat) || 0, ctx: { ...pub, ...opt } };
}

export function renderSeats(doc, pub, options = 0) {
  const { mySeat, ctx } = toContext(pub, options);
  resetSeatSlots(doc, Boolean(pub && pub.phase === 'finished'));
  for (const item of (pub && pub.seatSummary) || []) {
    updateSeatSlot(doc, item, buildSeatFlags(pub, item, { mySeat, ctx }));
  }
}
