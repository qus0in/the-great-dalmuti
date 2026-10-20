import { it } from 'node:test';
import assert from 'node:assert/strict';
import * as dom from './public/js/play-dom.js';
import { renderHandCards } from './public/js/play-dom-cards.js';

function createNode(tag = 'div') {
  const attrs = {};
  const children = [];
  return {
    tag,
    className: '',
    textContent: '',
    dataset: {},
    attrs,
    children,
    setAttribute: (k, v) => {
      attrs[k] = v;
    },
    appendChild: (c) => {
      children.push(c);
      return c;
    },
  };
}

function createTrickDoc() {
  const trick = createNode('div');
  let text = '';
  Object.defineProperty(trick, 'textContent', {
    get: () => text,
    set: (v) => {
      text = v;
      if (v === '') trick.children.length = 0;
    },
  });
  const nodes = {
    '[data-play="trick-target"]': createNode('span'),
    '[data-play="trick"]': trick,
  };
  return {
    nodes,
    createElement: (t) => createNode(t),
    querySelector: (s) => nodes[s] ?? null,
  };
}

it('Given lone jester lastPlay, When renderPlay runs repeatedly, Then card--jester renders and DOM node is preserved across syncs', () => {
  const doc = createTrickDoc();
  const publicState = {
    phase: 'finished',
    currentTurnSeat: null,
    seatSummary: [],
    lastPlay: { seat: 3, rank: 13, count: 1 },
  };
  dom.renderPlay(doc, { mySeat: 0, publicState });

  const target = doc.nodes['[data-play="trick-target"]'];
  const trick = doc.nodes['[data-play="trick"]'];
  assert.equal(target.textContent, '1장 조합 (★ 어릿광대)');
  assert.equal(trick.children.length, 1);
  assert.equal(trick.dataset.trickCount, '1');

  const firstWrap = trick.children[0];
  const card = firstWrap.children[0];
  assert.equal(card.className, 'card card--jester');
  assert.equal(card.attrs['aria-label'], '★ 어릿광대');

  dom.renderPlay(doc, { mySeat: 0, publicState });
  assert.equal(trick.children.length, 1);
  assert.equal(trick.children[0], firstWrap);
  const next = { ...publicState, lastPlay: { seat: 3, rank: 12, count: 12 } };
  dom.renderPlay(doc, { mySeat: 0, publicState: next });
  assert.equal(trick.dataset.trickCount, '12');
  assert.equal(trick.children.length, 12);
  assert.equal(trick.children[0].children[0].className, 'card card--rank-12');
});

it('Given a hand, When renderHandCards runs, Then it records the count and refreshes cards', () => {
  const container = createNode('div');
  Object.defineProperty(container, 'textContent', {
    get: () => '',
    set: () => {
      container.children.length = 0;
    },
  });
  const doc = { querySelector: () => container, createElement: createNode };
  const hand = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, rank: 5 }));

  renderHandCards(doc, { hand });
  assert.equal(container.dataset.handCount, '20');
  assert.equal(container.children.length, 20);

  renderHandCards(doc, { hand: hand.slice(0, 2), selected: ['c1'] });
  assert.equal(container.dataset.handCount, '2');
  assert.equal(container.children.length, 2);
  assert.equal(
    container.children[1].className,
    'card card--rank-5 is-selected',
  );
});
