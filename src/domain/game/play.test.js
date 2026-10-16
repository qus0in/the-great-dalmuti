import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DomainError } from './cards.js';
import { evaluatePlay, canBeat } from './play.js';

const c = (rank, id) => ({ rank, id });

describe('Play non-joker', () => {
  it('Given identical non-jester cards, When evaluatePlay, Then rank and count returned', () => {
    assert.deepEqual(evaluatePlay([c(5, 'a'), c(5, 'b')]), {
      rank: 5,
      count: 2,
    });
  });

  it('Given mixed non-jester ranks, When evaluatePlay, Then MIXED_RANKS', () => {
    assert.throws(
      () => evaluatePlay([c(2, 'a'), c(3, 'b')]),
      (e) => e instanceof DomainError && e.code === 'MIXED_RANKS',
    );
  });

  it('Given empty play, When evaluatePlay, Then EMPTY_PLAY', () => {
    assert.throws(
      () => evaluatePlay([]),
      (e) => e instanceof DomainError && e.code === 'EMPTY_PLAY',
    );
  });

  it('Given invalid card, When evaluatePlay, Then INVALID_PLAY', () => {
    assert.throws(
      () => evaluatePlay([null]),
      (e) => e instanceof DomainError && e.code === 'INVALID_PLAY',
    );
  });
});

describe('Play joker', () => {
  it('Given lone jester, When evaluatePlay, Then rank 13 count 1', () => {
    assert.deepEqual(evaluatePlay([c(13, 'j1')]), { rank: 13, count: 1 });
  });

  it('Given jokers copying rank, When evaluatePlay, Then count includes all', () => {
    assert.deepEqual(evaluatePlay([c(2, 'a'), c(13, 'j1'), c(13, 'j2')]), {
      rank: 2,
      count: 3,
    });
  });

  it('Given two jesters, When evaluatePlay, Then rank-13 pair returned', () => {
    assert.deepEqual(evaluatePlay([c(13, 'j1'), c(13, 'j2')]), {
      rank: 13,
      count: 2,
    });
  });
});

describe('Play comparison', () => {
  it('Given higher same-count set, When canBeat, Then true', () => {
    assert.equal(canBeat({ rank: 5, count: 2 }, { rank: 3, count: 2 }), true);
  });

  it('Given lower rank set, When canBeat, Then false', () => {
    assert.equal(canBeat({ rank: 5, count: 2 }, { rank: 7, count: 2 }), false);
  });

  it('Given different counts, When canBeat, Then false', () => {
    assert.equal(canBeat({ rank: 5, count: 2 }, { rank: 3, count: 3 }), false);
  });
});
