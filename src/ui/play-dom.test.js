import { it } from 'node:test';
import assert from 'node:assert/strict';
import * as dom from './public/js/play-dom.js';

function createNode(tag = 'div', sub = {}) {
  const attrs = {};
  const map = {};
  const children = [];
  return {
    tag,
    className: '',
    textContent: '',
    disabled: false,
    dataset: {},
    attrs,
    children,
    setAttribute: (k, v) => {
      attrs[k] = v;
    },
    appendChild: (c) => children.push(c),
    querySelector: (s) => sub[s] ?? null,
    addEventListener: (t, fn) => (map[t] ??= []).push(fn),
    removeEventListener: (t, fn) => {
      map[t] = (map[t] ?? []).filter((f) => f !== fn);
    },
    emit: (t, ev = {}) => (map[t] ?? []).forEach((fn) => fn(ev)),
  };
}

function createFakeDoc() {
  const nodes = {};
  const keys = 'round,banner,trick,hand,submit,pass,message'.split(',');
  for (const k of keys) nodes[`[data-play="${k}"]`] = createNode();
  for (let s = 0; s < 4; s += 1) {
    nodes[`[data-play="seat"][data-seat="${s}"]`] = createNode('div', {
      '.seat__name, .play-hand-header__title': createNode('span'),
      '.seat__count': createNode('span'),
      '.seat__status': createNode('span'),
    });
  }
  return {
    nodes,
    createElement: (t) => createNode(t),
    querySelector: (s) => nodes[s] ?? null,
  };
}

it('Given my turn view, When renderPlay runs, Then cards, seats, trick, and controls render', () => {
  const doc = createFakeDoc();
  dom.renderPlay(doc, {
    mySeat: 1,
    publicState: {
      phase: 'playing',
      currentTurnSeat: 1,
      seatSummary: [{ seat: 1, userName: '나', cardCount: 15 }],
      lastPlay: { seat: 0, rank: 7, count: 2 },
    },
    hand: [
      { id: 'c6', rank: 6 },
      { id: 'j0', rank: 13 },
    ],
    selected: ['c6'],
  });
  const [first, second] = doc.nodes['[data-play="hand"]'].children;
  assert.equal(first.dataset.cardId, 'c6');
  assert.ok(first.className.includes('is-selected'));
  assert.equal(first.attrs['aria-pressed'], 'true');
  assert.equal(second.attrs['aria-pressed'], 'false');
  assert.equal(dom.mapSeatToSlot(1, 1), 2);
  const mySlot = doc.nodes['[data-play="seat"][data-seat="2"]'];
  assert.ok(mySlot.className.includes('is-turn'));
  assert.equal(doc.nodes['[data-play="submit"]'].disabled, false);
  assert.equal(doc.nodes['[data-play="trick"]'].children.length, 2);
});

it('Given other turn and bindPlay, When events fire, Then disabled, message, and delegation work', () => {
  const doc = createFakeDoc();
  const publicState = { phase: 'playing', currentTurnSeat: 2 };
  dom.renderPlay(doc, { mySeat: 0, publicState });
  dom.showMessage(doc, '차례 아님');
  assert.equal(doc.nodes['[data-play="submit"]'].disabled, true);
  assert.equal(doc.nodes['[data-play="message"]'].textContent, '차례 아님');
  const log = [];
  const unbind = dom.bindPlay(doc, {
    onToggle: (id) => log.push(`t:${id}`),
    onSubmit: () => log.push('sub'),
    onPass: () => log.push('pass'),
  });
  const target = { closest: () => ({ dataset: { cardId: 'c1' } }) };
  doc.nodes['[data-play="hand"]'].emit('click', { target });
  doc.nodes['[data-play="hand"]'].emit('keydown', { key: 'Enter', target });
  doc.nodes['[data-play="submit"]'].emit('click');
  doc.nodes['[data-play="pass"]'].emit('click');
  unbind();
  doc.nodes['[data-play="submit"]'].emit('click');
  assert.deepEqual(log, ['t:c1', 't:c1', 'sub', 'pass']);
});
