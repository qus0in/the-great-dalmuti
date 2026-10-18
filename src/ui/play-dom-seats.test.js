import { it } from 'node:test';
import assert from 'node:assert/strict';
import * as dom from './public/js/play-dom.js';

const RANK_SEL = '[data-play="seat-rank"], .seat__name-row .badge';
const STATUS_SEL =
  '[data-play="seat-status"], .seat__status, .badge--turn, .badge--pass';
const ALL_KEYS =
  'round,banner,trick,trick-target,previous-trick,tribute,deck-stat,selection-hint'.split(
    ',',
  );
const OPT_KEYS = ALL_KEYS.slice(4);

function makeNode(sub = {}) {
  const children = [];
  return {
    className: '',
    textContent: '',
    hidden: false,
    dataset: {},
    children,
    setAttribute() {},
    appendChild: (c) => children.push(c),
    replaceChildren: (...c) => children.splice(0, children.length, ...c),
    querySelector: (s) =>
      sub[s] ?? children.find((c) => c.className?.includes('avatar')) ?? null,
  };
}

function createDoc() {
  const nodes = Object.fromEntries(
    ALL_KEYS.map((k) => [`[data-play="${k}"]`, makeNode()]),
  );
  for (let s = 0; s < 4; s += 1) {
    const sub = { '.seat__avatar': makeNode(), '.seat__count': makeNode() };
    sub['.seat__name, .play-hand-header__title'] = makeNode();
    sub[RANK_SEL] = makeNode();
    sub[STATUS_SEL] = makeNode();
    nodes[`[data-play="seat"][data-seat="${s}"]`] = makeNode(sub);
  }
  return {
    nodes,
    createElement: () => makeNode(),
    querySelector: (s) => nodes[s] ?? null,
  };
}

it('Given seatSummary, When renderPlay runs, Then avatar, name, rank chip, and turn/pass badges update', () => {
  const doc = createDoc();
  dom.renderPlay(doc, {
    mySeat: 0,
    publicState: {
      phase: 'playing',
      currentTurnSeat: 2,
      seatSummary: [
        { seat: 0, userName: '참가자' },
        { seat: 1, userName: '봇 1', passed: true },
        { seat: 2, userName: '민우', finishPosition: 1 },
        { seat: 3, userName: '지은', rank: '2위 소달무티' },
      ],
      lastPlay: null,
    },
  });
  const [north, south, west] = [0, 2, 3].map(
    (s) => doc.nodes[`[data-play="seat"][data-seat="${s}"]`],
  );
  assert.ok(north.querySelector('.seat__avatar').querySelector('.avatar'));
  assert.equal(north.querySelector(STATUS_SEL).textContent, '차례(Turn)');
  assert.equal(north.querySelector(RANK_SEL).textContent, '1위 대달무티');
  assert.equal(south.querySelector(RANK_SEL).hidden, true);
  assert.ok(west.className.includes('is-passed'));
});

it('Given finished phase and optional fields, When renderPlay runs, Then badges hide and fields toggle', () => {
  const doc = createDoc();
  dom.renderPlay(doc, {
    mySeat: 0,
    publicState: { phase: 'finished', currentTurnSeat: 1, lastPlay: null },
  });
  const north = doc.nodes['[data-play="seat"][data-seat="0"]'];
  assert.equal(north.querySelector(RANK_SEL).hidden, true);
  assert.equal(north.querySelector(STATUS_SEL).hidden, true);
  assert.equal(doc.nodes['[data-play="trick-target"]'].textContent, '새 트릭');
  for (const k of OPT_KEYS)
    assert.equal(doc.nodes[`[data-play="${k}"]`].hidden, true);

  const play = { rank: 7, count: 3 };
  const playing = {
    phase: 'playing',
    currentTurnSeat: 0,
    lastPlay: play,
    previousPlay: play,
    tribute: { greaterCount: 1 },
    discardCount: 20,
  };
  dom.renderPlay(doc, { mySeat: 0, selected: ['c1'], publicState: playing });
  for (const k of OPT_KEYS)
    assert.equal(doc.nodes[`[data-play="${k}"]`].hidden, false);
});
