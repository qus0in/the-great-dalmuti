import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRICK_ERROR_CODES,
  createTrickState,
  pass,
  play,
  startNextTrick,
} from './trick.js';
import { DomainError } from './cards.js';

const C = TRICK_ERROR_CODES;

function makeState(overrides = {}) {
  return createTrickState({
    playerOrder: ['a', 'b', 'c', 'd'],
    leaderId: 'a',
    handCounts: { a: 5, b: 5, c: 5, d: 5 },
    ...overrides,
  });
}

function expectCode(fn, expectedCode) {
  assert.throws(
    fn,
    (err) => err instanceof DomainError && err.code === expectedCode,
  );
}

describe('Trick creation and lead validation', () => {
  it('Given valid seats, When createTrickState, Then leader holds turn', () => {
    const state = makeState();
    assert.equal(state.turnId, 'a');
    assert.equal(state.status, 'in-progress');
    assert.deepEqual(state.finishOrder, []);
  });

  it('Given invalid parameters, When createTrickState, Then throws INVALID_TRICK_INPUT', () => {
    expectCode(() => makeState({ leaderId: 'z' }), C.INVALID_TRICK_INPUT);
    expectCode(
      () => makeState({ handCounts: { a: 0, b: 5, c: 5, d: 5 } }),
      C.INVALID_TRICK_INPUT,
    );
  });
});

describe('Trick turn order and play validation', () => {
  it('Given a leader, When passing before any play, Then PASS_NOT_ALLOWED', () => {
    expectCode(() => pass(makeState(), 'a'), C.PASS_NOT_ALLOWED);
  });

  it('Given non-turn player or invalid play, Then throws DomainError', () => {
    const state = play(makeState(), 'a', { rank: 3, count: 1 });
    expectCode(() => play(state, 'c', { rank: 3, count: 1 }), C.NOT_YOUR_TURN);
    expectCode(() => play(state, 'b', { rank: 1, count: 99 }), C.INVALID_PLAY);
  });
});

describe('Trick ending and next lead assignment', () => {
  it('Given three passes, When last pass arrives, Then ends and last player leads next trick', () => {
    let s = play(makeState(), 'a', { rank: 3, count: 1 });
    s = pass(s, 'b');
    s = pass(s, 'c');
    s = pass(s, 'd');
    assert.equal(s.status, 'ended');
    assert.equal(s.nextLeadId, 'a');
    const next = startNextTrick(s);
    assert.equal(next.turnId, 'a');
    assert.equal(next.trick.plays.length, 0);
  });

  it('Given leader who ran out, When trick ends, Then next clockwise player leads', () => {
    let s = play(makeState(), 'a', { rank: 3, count: 5 });
    s = pass(s, 'b');
    s = pass(s, 'c');
    s = pass(s, 'd');
    assert.equal(s.status, 'ended');
    assert.equal(s.nextLeadId, 'b');
    assert.deepEqual(s.finishOrder, ['a']);
  });

  it('Given ended trick, When acting again, Then TRICK_ENDED', () => {
    let s = play(makeState(), 'a', { rank: 3, count: 1 });
    s = pass(s, 'b');
    s = pass(s, 'c');
    s = pass(s, 'd');
    expectCode(() => play(s, 'a', { rank: 2, count: 1 }), C.TRICK_ENDED);
  });
});
