import { it } from 'node:test';
import assert from 'node:assert/strict';
import { renderPlay } from './public/js/play-dom.js';
import { SILHOUETTE_SRC } from './public/js/avatar.js';
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
it('Given avatar changes, When resync runs, Then img remounts', () => {
  const doc = createDoc();
  const base = { mySeat: 0, hiddenIds: new Set(), hand: [], selected: [] };
  renderPlay(doc, { ...base, publicState: pubOf(seatsOf()) });
  const me = imgOf(doc, 2);
  renderPlay(doc, {
    ...base,
    hiddenIds: new Set(['u1']),
    publicState: pubOf(seatsOf()),
  });
  assert.notEqual(imgOf(doc, 2), me);
  assert.equal(imgOf(doc, 2).src, SILHOUETTE_SRC);
  renderPlay(doc, {
    ...base,
    publicState: pubOf(seatsOf({ me: { avatarUrl: 'https://b.test/u1.png' } })),
  });
  assert.ok(imgOf(doc, 2).src.includes('b.test'));
  renderPlay(doc, {
    ...base,
    publicState: pubOf(seatsOf({ me: { userName: '나나' } })),
  });
  assert.equal(
    doc.nodes[2].sub['.seat__name, .play-hand-header__title'].textContent,
    '나나',
  );
});
