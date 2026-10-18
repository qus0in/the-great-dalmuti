// 신고 진입점 테스트 설비 — 가짜 DOM·좌석 문서·공개 상태.
export const RANK_SEL = '[data-play="seat-rank"], .seat__name-row .badge';
export const STATUS_SEL =
  '[data-play="seat-status"], .seat__status, .badge--turn, .badge--pass';
const parents = new WeakMap();
export function node() {
  const listeners = {};
  const el = {
    children: [],
    attrs: {},
    hidden: false,
    value: '',
    checked: false,
    textContent: '',
    className: '',
    setAttribute: (k, v) => (el.attrs[k] = v),
    appendChild: (c) => {
      parents.set(c, el);
      return el.children.push(c);
    },
    append: (...cs) => el.children.push(...cs),
    replaceChildren: (...cs) =>
      el.children.splice(0, el.children.length, ...cs),
    remove: () => {
      const parent = parents.get(el);
      if (parent) parent.children.splice(parent.children.indexOf(el), 1);
    },
    addEventListener: (t, fn) => {
      (listeners[t] = listeners[t] || []).push(fn);
    },
    emit: (t, ev = {}) => (listeners[t] || []).forEach((fn) => fn(ev)),
  };
  return el;
}
export function seatOf(doc) {
  const els = {};
  ['avatar', 'row', 'count', 'rank', 'status', 'name'].forEach((key) => {
    els[key] = node();
  });
  const seat = node();
  seat.ownerDocument = doc;
  seat.querySelector = (sel) => {
    if (sel === '.seat__avatar') return els.avatar;
    if (sel === '.seat__name, .play-hand-header__title') return els.name;
    if (sel === '.seat__count') return els.count;
    if (sel === RANK_SEL) return els.rank;
    if (sel === STATUS_SEL) return els.status;
    if (sel === '.seat__name-row') return els.row;
    if (sel === '[data-report="seat"]') {
      return els.row.children.find((c) => c.attrs['data-report']) || null;
    }
    return null;
  };
  return { seat, els };
}
export function docOf() {
  const doc = {
    slots: {},
    createElement: () => node(),
    body: { appendChild: () => {} },
    querySelector: (sel) => doc.slots[sel.match(/data-seat="(\d)"/)[1]].seat,
  };
  for (let s = 0; s < 4; s += 1) doc.slots[s] = seatOf(doc);
  return doc;
}
export function pubOf(summary) {
  return { phase: 'playing', currentTurnSeat: 0, seatSummary: summary };
}
