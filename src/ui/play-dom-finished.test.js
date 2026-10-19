import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as dom from './public/js/play-dom.js';

const RANK_SEL = '[data-play="seat-rank"], .seat__name-row .badge';
const STATUS_SEL =
  '[data-play="seat-status"], .seat__status, .badge--turn, .badge--pass';

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
  const nodes = {
    '[data-play="banner"]': makeNode(),
    '[data-play="round"]': makeNode(),
  };
  for (let s = 0; s < 4; s += 1) {
    const sub = { '.seat__avatar': makeNode(), '.seat__count': makeNode() };
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

function finishedPub() {
  return {
    phase: 'finished',
    currentTurnSeat: null,
    seatSummary: [
      { seat: 0, userName: 'a', finishPosition: 3 },
      { seat: 1, userName: 'b', finishPosition: 4 },
      { seat: 2, userName: '나', finishPosition: 1 },
      { seat: 3, userName: 'd', finishPosition: 2 },
    ],
    lastPlay: { seat: 0, rank: 7, count: 3 },
  };
}

describe('Finished badges', () => {
  it('Given finished state, When render, Then badges show', () => {
    const doc = createDoc();
    dom.renderPlay(doc, { mySeat: 2, publicState: finishedPub() });
    for (let s = 0; s < 4; s += 1) {
      const badge =
        doc.nodes[`[data-play="seat"][data-seat="${s}"]`].querySelector(
          RANK_SEL,
        );
      assert.equal(badge.hidden, false);
    }
  });
});

describe('Finished banner', () => {
  it('Given finished state, When render, Then banner shows mine', () => {
    const doc = createDoc();
    dom.renderPlay(doc, { mySeat: 2, publicState: finishedPub() });
    assert.equal(doc.nodes['[data-play="banner"]'].textContent, '1위 대달무티');
  });
});

describe('Playing out badge', () => {
  it('Given out seat, When render, Then badge shows title', () => {
    const doc = createDoc();
    dom.renderPlay(doc, {
      mySeat: 0,
      publicState: {
        phase: 'playing',
        currentTurnSeat: 1,
        lastPlay: null,
        seatSummary: [0, 1, 2, 3].map((seat) => ({
          seat,
          userName: '좌석',
          finishPosition: seat === 1 ? 1 : null,
        })),
      },
    });
    const badge =
      doc.nodes['[data-play="seat"][data-seat="3"]'].querySelector(RANK_SEL);
    assert.equal(badge.textContent, '1위 대달무티');
  });
});
