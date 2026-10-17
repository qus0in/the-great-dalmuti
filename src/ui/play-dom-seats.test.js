import { it } from 'node:test';
import assert from 'node:assert/strict';
import * as dom from './public/js/play-dom.js';

const RANK_SEL = '[data-play="seat-rank"], .seat__name-row .badge';
const STATUS_SEL =
  '[data-play="seat-status"], .seat__status, .badge--turn, .badge--pass';
const OPT_KEYS = ['previous-trick', 'tribute', 'deck-stat', 'selection-hint'];
const HOOKS = ['round', 'banner', 'trick', 'trick-target', ...OPT_KEYS];

function createNode(sub = {}) {
  return {
    className: '',
    textContent: '',
    hidden: false,
    disabled: false,
    dataset: {},
    setAttribute: () => {},
    appendChild: () => {},
    querySelector: (s) => sub[s] ?? null,
  };
}

function createFakeSeatDoc() {
  const nodes = {};
  for (const k of HOOKS) nodes[`[data-play="${k}"]`] = createNode();
  for (let s = 0; s < 4; s += 1) {
    nodes[`[data-play="seat"][data-seat="${s}"]`] = createNode({
      '.seat__avatar': createNode(),
      '.seat__name, .play-hand-header__title': createNode(),
      [RANK_SEL]: createNode(),
      [STATUS_SEL]: createNode(),
      '.seat__count': createNode(),
    });
  }
  return {
    nodes,
    createElement: () => createNode(),
    querySelector: (s) => nodes[s] ?? null,
  };
}

it('Given seatSummary, When renderPlay runs, Then avatar, name, rank chip, and turn/pass badges update', () => {
  const doc = createFakeSeatDoc();
  dom.renderPlay(doc, {
    mySeat: 0,
    publicState: {
      phase: 'playing',
      currentTurnSeat: 2,
      seatSummary: [
        { seat: 0, userName: '참가자', cardCount: 19 },
        { seat: 1, userName: '봇 1', cardCount: 18, passed: true },
        { seat: 2, userName: '민우', cardCount: 17, finishPosition: 1 },
        { seat: 3, userName: '지은', cardCount: 20, rank: '2위 소달무티' },
      ],
      lastPlay: null,
    },
  });
  const north = doc.nodes['[data-play="seat"][data-seat="0"]'];
  const south = doc.nodes['[data-play="seat"][data-seat="2"]'];
  const west = doc.nodes['[data-play="seat"][data-seat="3"]'];
  assert.equal(north.querySelector('.seat__avatar').textContent, '민');
  assert.equal(north.querySelector(STATUS_SEL).textContent, '차례(Turn)');
  assert.equal(north.querySelector(RANK_SEL).textContent, '1위 대달무티');
  assert.equal(south.querySelector(RANK_SEL).hidden, true);
  assert.ok(west.className.includes('is-passed'));
});

it('Given finished phase and optional fields, When renderPlay runs, Then badges hide and fields toggle', () => {
  const doc = createFakeSeatDoc();
  dom.renderPlay(doc, {
    mySeat: 0,
    publicState: { phase: 'finished', currentTurnSeat: 1, lastPlay: null },
  });
  const north = doc.nodes['[data-play="seat"][data-seat="0"]'];
  assert.equal(north.querySelector(RANK_SEL).hidden, true);
  assert.equal(north.querySelector(STATUS_SEL).hidden, true);
  assert.equal(doc.nodes['[data-play="trick-target"]'].textContent, '새 트릭');
  for (const k of OPT_KEYS) {
    assert.equal(doc.nodes[`[data-play="${k}"]`].hidden, true);
  }

  dom.renderPlay(doc, {
    mySeat: 0,
    selected: ['c1'],
    publicState: {
      phase: 'playing',
      currentTurnSeat: 0,
      lastPlay: { seat: 1, rank: 7, count: 3 },
      previousPlay: { rank: 9, count: 3 },
      tribute: { greaterCount: 2, lesserCount: 1 },
      discardCount: 20,
    },
  });
  for (const k of OPT_KEYS) {
    assert.equal(doc.nodes[`[data-play="${k}"]`].hidden, false);
  }
});
