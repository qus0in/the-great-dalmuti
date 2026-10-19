import { it } from 'node:test';
import assert from 'node:assert/strict';
import { renderPlay } from './public/js/play-dom.js';
const STATUS_SEL =
  '[data-play="seat-status"], .seat__status, .badge--turn, .badge--pass';
const leaf = () => ({ className: '', textContent: '', hidden: false });
function box() {
  const children = [];
  return {
    dataset: {},
    children,
    setAttribute() {},
    appendChild: (c) => children.push(c),
    replaceChildren: (...items) =>
      children.splice(0, children.length, ...items),
    querySelector: () =>
      children.find((c) => c.className?.includes('avatar')) ?? null,
  };
}
function seat() {
  const sub = { '.seat__avatar': box(), '.seat__count': leaf() };
  sub['.seat__name, .play-hand-header__title'] = leaf();
  sub[STATUS_SEL] = leaf();
  return { className: '', sub, querySelector: (s) => sub[s] ?? null };
}
function createDoc() {
  const nodes = { 0: seat(), 1: seat(), 2: seat(), 3: seat() };
  return {
    nodes,
    createElement: () => box(),
    querySelector: (s) =>
      nodes[Number(s.match(/data-seat="(\d)"/)?.[1])] ?? null,
  };
}
const imgOf = (doc, slot) =>
  doc.nodes[slot].querySelector('.seat__avatar').querySelector('.avatar')
    ?.children?.[0] ?? null;
const seatsOf = (over = {}) => [
  {
    seat: 0,
    userId: 'u1',
    userName: '나',
    cardCount: 5,
    avatarUrl: 'https://a.test/u1.png',
    ...over.me,
  },
  {
    seat: 1,
    userId: 'u2',
    userName: '상대',
    cardCount: 3,
    avatarUrl: 'https://a.test/u2.png',
    ...over.peer,
  },
];
const pubOf = (seats, turn = 0) => ({
  phase: 'playing',
  currentTurnSeat: turn,
  seatSummary: seats,
  lastPlay: null,
});
it('Given unchanged avatars, When selection toggles, Then img nodes persist', () => {
  const doc = createDoc();
  const base = {
    mySeat: 0,
    hiddenIds: new Set(),
    hand: [{ id: 'c1', rank: 5 }],
  };
  const seats = seatsOf();
  renderPlay(doc, { ...base, selected: [], publicState: pubOf(seats) });
  const me = imgOf(doc, 2);
  assert.ok(me);
  renderPlay(doc, { ...base, selected: ['c1'], publicState: pubOf(seats) });
  renderPlay(doc, { ...base, selected: [], publicState: pubOf(seats) });
  assert.equal(imgOf(doc, 2), me);
});
it('Given turn and count changes, When resync runs, Then avatars persist', () => {
  const doc = createDoc();
  const base = { mySeat: 0, hiddenIds: new Set(), hand: [], selected: [] };
  renderPlay(doc, { ...base, publicState: pubOf(seatsOf()) });
  const me = imgOf(doc, 2);
  renderPlay(doc, { ...base, publicState: pubOf(seatsOf(), 1) });
  assert.equal(imgOf(doc, 2), me);
  assert.equal(doc.nodes[2].sub[STATUS_SEL].textContent, '대기 중');
  renderPlay(doc, {
    ...base,
    publicState: pubOf(seatsOf({ me: { cardCount: 4 } })),
  });
  assert.equal(imgOf(doc, 2), me);
  assert.equal(doc.nodes[2].sub['.seat__count'].textContent, '4장');
});
