const SEAT_TITLES = ',1위 대달무티,2위 소달무티,3위 소농노,4위 대농노'.split(
  ',',
);
const RANK_SEL = '[data-play="seat-rank"], .seat__name-row .badge';
const STATUS_SEL =
  '[data-play="seat-status"], .seat__status, .badge--turn, .badge--pass';

export function mapSeatToSlot(seat, mySeat = 0) {
  return (seat - mySeat + 6) % 4;
}

function setText(root, selector, text) {
  const el = root.querySelector(selector);
  if (el) el.textContent = text;
}

function updateSeatRank(root, item) {
  const el = root.querySelector(RANK_SEL);
  if (!el) return;
  const text = item.rank
    ? String(item.rank)
    : SEAT_TITLES[item.finishPosition] || '';
  el.hidden = !text;
  if (text) el.textContent = text;
}

function updateSeatStatus(root, { isFinished, isTurn, isPassed }) {
  const el = root.querySelector(STATUS_SEL);
  if (!el) return;
  el.hidden = Boolean(isFinished);
  if (isFinished) {
    el.className = 'seat__status';
    el.textContent = '';
  } else if (isTurn) {
    el.className = 'badge badge--turn';
    el.textContent = '차례(Turn)';
  } else if (isPassed) {
    el.className = 'badge badge--pass';
    el.textContent = '패스(Pass)';
  } else {
    el.className = 'seat__status';
    el.textContent = '대기 중';
  }
}

function seatClassName(slot, { isTurn, isPassed }) {
  const base = slot === 2 ? 'seat seat--me' : 'seat';
  if (isTurn) return `${base} is-turn`;
  return isPassed ? `${base} is-passed` : base;
}

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
  const { slot } = flags;
  const el = doc.querySelector(`[data-play="seat"][data-seat="${slot}"]`);
  if (!el) return;
  const name = item.userName || '';
  const avatar = name.trim().charAt(0) || String(item.seat ?? '');
  el.className = seatClassName(slot, flags);
  setText(el, '.seat__avatar', avatar);
  setText(el, '.seat__name, .play-hand-header__title', name);
  setText(el, '.seat__count', `${item.cardCount || 0}장`);
  updateSeatRank(el, item);
  updateSeatStatus(el, flags);
}

function buildSeatFlags(pub, item, mySeat) {
  const phase = pub ? pub.phase : 'waiting';
  const isPlaying = phase === 'playing';
  const isTurn = Boolean(isPlaying && item.seat === pub.currentTurnSeat);
  return {
    slot: mapSeatToSlot(item.seat, mySeat),
    isFinished: phase === 'finished',
    isTurn,
    isPassed: Boolean(isPlaying && !isTurn && item.passed),
  };
}

export function renderSeats(doc, pub, mySeat = 0) {
  resetSeatSlots(doc, Boolean(pub && pub.phase === 'finished'));
  for (const item of (pub && pub.seatSummary) || []) {
    updateSeatSlot(doc, item, buildSeatFlags(pub, item, mySeat));
  }
}
