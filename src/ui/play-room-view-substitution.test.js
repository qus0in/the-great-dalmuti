import { it } from 'node:test';
import assert from 'node:assert/strict';
import { renderRoomView } from './public/js/play-view.js';

function makeEl() {
  return {
    hidden: false,
    textContent: '',
    disabled: false,
    className: '',
    dataset: {},
    querySelector: () => null,
    setAttribute() {},
    addEventListener() {},
  };
}

function makeDoc() {
  const store = new Map();
  return {
    querySelector: (sel) => {
      if (!store.has(sel)) store.set(sel, makeEl());
      return store.get(sel);
    },
    createElement: () => makeEl(),
  };
}

const seatPrivacy = { context: () => ({}) };
const baseOptions = {
  mySeat: 0,
  client: null,
  seatPrivacy,
  reportContext: {},
  origin: 'https://game.test',
  onStart: () => {},
};

it('Given no substitution, When room view renders playing, Then it stays hidden', () => {
  const doc = makeDoc();
  renderRoomView(
    doc,
    {
      code: 'R1',
      publicState: { phase: 'playing', seatSummary: [] },
      lastSubstitution: null,
    },
    baseOptions,
  );
  assert.equal(doc.querySelector('[data-play="substitution"]').hidden, true);
});

it('Given substitution, When room view renders playing, Then notice shows', () => {
  const doc = makeDoc();
  renderRoomView(
    doc,
    {
      code: 'R1',
      publicState: { phase: 'playing', seatSummary: [] },
      lastSubstitution: { seat: 0, action: 'pass' },
    },
    baseOptions,
  );
  const region = doc.querySelector('[data-play="substitution"]');
  assert.equal(region.hidden, false);
  assert.equal(region.textContent, '시간이 지나 대신 패스했어요');
});
