import { it } from 'node:test';
import assert from 'node:assert/strict';
import { bindPlay } from './public/js/play-dom.js';
import {
  isPending,
  startPending,
  stopPending,
} from './public/js/play-pending.js';
function el(text = '') {
  const attrs = {};
  const listeners = {};
  const children = [];
  return {
    className: '',
    textContent: text,
    disabled: false,
    dataset: {},
    attrs,
    children,
    getAttribute: (k) => attrs[k] ?? null,
    setAttribute: (k, v) => void (attrs[k] = v),
    removeAttribute: (k) => void delete attrs[k],
    appendChild: (child) => (children.push(child), child),
    querySelector: () => null,
    addEventListener: (t, fn) => void (listeners[t] = fn),
    removeEventListener: () => {},
    fire: (t, ev) => listeners[t]?.(ev),
  };
}
function fakeDoc() {
  const submit = el('카드 내기 (2장 선택)');
  const pass = el('패스(Pass)');
  const hand = el('');
  const map = {
    '[data-play="submit"]': submit,
    '[data-play="pass"]': pass,
    '[data-play="hand"]': hand,
  };
  return {
    submit,
    pass,
    hand,
    createElement: () => el(''),
    querySelector: (s) => map[s] ?? null,
  };
}
it('Given turn, When submit pending, Then busy and label', () => {
  const doc = fakeDoc();
  assert.equal(startPending(doc, 'submit'), true);
  assert.equal(doc.submit.disabled, true);
  assert.equal(doc.pass.disabled, true);
  assert.equal(doc.submit.textContent, '내는 중…');
  assert.equal(doc.hand.getAttribute('aria-busy'), 'true');
  assert.equal(isPending(doc), true);
  stopPending(doc);
});
it('Given turn, When pass pending, Then restore', () => {
  const doc = fakeDoc();
  assert.equal(startPending(doc, 'pass'), true);
  assert.equal(doc.pass.textContent, '넘기는 중…');
  stopPending(doc);
  assert.equal(doc.pass.textContent, '패스(Pass)');
  assert.equal(isPending(doc), false);
});
it('Given pending, When card or resend, Then blocked', () => {
  const doc = fakeDoc();
  assert.equal(startPending(doc, 'submit'), true);
  assert.equal(startPending(doc, 'submit'), false);
  let count = 0;
  bindPlay(doc, {
    onToggle: () => {
      count += 1;
    },
  });
  const ev = { target: { closest: () => ({ dataset: { cardId: 'c1' } }) } };
  doc.hand.fire('click', ev);
  assert.equal(count, 0);
  stopPending(doc);
  doc.hand.fire('click', ev);
  assert.equal(count, 1);
});
it('Given delayed api, When done or fail, Then restore', async () => {
  const doc = fakeDoc();
  startPending(doc, 'submit');
  await new Promise((done) => {
    setTimeout(done, 20);
  });
  stopPending(doc);
  assert.equal(doc.submit.textContent, '카드 내기 (2장 선택)');
  startPending(doc, 'pass');
  await assert.rejects(async () => {
    await new Promise((done) => {
      setTimeout(done, 5);
    });
    throw new Error('boom');
  });
  stopPending(doc);
  assert.equal(doc.pass.textContent, '패스(Pass)');
  assert.equal(isPending(doc), false);
});
