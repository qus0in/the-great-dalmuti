import { it } from 'node:test';
import assert from 'node:assert/strict';
import { renderHint } from './public/js/play-dom-hint.js';

function node(id = '') {
  const attrs = {};
  return {
    id,
    className: 'card card--rank-6',
    dataset: { cardId: id },
    attrs,
    hidden: false,
    textContent: '',
    setAttribute: (key, value) => {
      attrs[key] = value;
    },
    getAttribute: (key) => attrs[key] ?? null,
    removeAttribute: (key) => {
      delete attrs[key];
    },
  };
}

function fakeDoc() {
  const hint = node('play-hint');
  const cards = [node('c1'), node('c2')];
  return {
    hint,
    cards,
    querySelector: (selector) =>
      selector === '[data-play="hint"]' ? hint : null,
    querySelectorAll: (selector) =>
      selector === '[data-play="card"]' ? cards : [],
  };
}

it('Given a play hint, When rendered, Then reason and recommended cards are accessible', () => {
  const doc = fakeDoc();
  renderHint(doc, {
    hint: {
      action: 'play',
      cards: ['c1'],
      reason: '낮은 카드 한 장을 내세요.',
    },
  });

  assert.equal(doc.hint.hidden, false);
  assert.equal(doc.hint.textContent, '낮은 카드 한 장을 내세요.');
  assert.ok(doc.cards[0].className.includes('is-hinted'));
  assert.equal(doc.cards[0].attrs['aria-describedby'], 'play-hint');
  assert.ok(!doc.cards[1].className.includes('is-hinted'));
  assert.equal(doc.cards[1].attrs['aria-describedby'], undefined);
});

it('Given no hint, When rendered, Then reason and previous card marks clear', () => {
  const doc = fakeDoc();
  renderHint(doc, {
    hint: { action: 'play', cards: ['c1'], reason: '추천 이유' },
  });
  renderHint(doc, { hint: null });

  assert.equal(doc.hint.hidden, true);
  assert.equal(doc.hint.textContent, '');
  assert.ok(!doc.cards[0].className.includes('is-hinted'));
  assert.equal(doc.cards[0].attrs['aria-describedby'], undefined);
});

it('Given a pass hint, When rendered, Then reason shows without card recommendations', () => {
  const doc = fakeDoc();
  renderHint(doc, {
    hint: { action: 'pass', cards: [], reason: '낼 수 없습니다.' },
  });

  assert.equal(doc.hint.hidden, false);
  assert.equal(doc.hint.textContent, '낼 수 없습니다.');
  assert.ok(doc.cards.every((card) => !card.className.includes('is-hinted')));
});
