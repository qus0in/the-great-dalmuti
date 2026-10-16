import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DomainError } from './cards.js';
import { assertPlayable } from './play.js';

const c = (rank, id) => ({ rank, id });

describe('Play lead rule', () => {
  it('Given lead with valid set, When assertPlayable, Then no throw', () => {
    assert.doesNotThrow(() => assertPlayable(null, [c(4, 'a')]));
  });

  it('Given invalid set, When assertPlayable, Then EMPTY_PLAY', () => {
    assert.throws(
      () => assertPlayable({ rank: 5, count: 2 }, []),
      (e) => e instanceof DomainError && e.code === 'EMPTY_PLAY',
    );
  });
});

describe('Play follow rule', () => {
  it('Given valid higher follow, When assertPlayable, Then no throw', () => {
    assert.doesNotThrow(() =>
      assertPlayable({ rank: 5, count: 2 }, [c(3, 'a'), c(13, 'j1')]),
    );
  });

  it('Given count mismatch, When assertPlayable, Then COUNT_MISMATCH', () => {
    assert.throws(
      () => assertPlayable({ rank: 5, count: 2 }, [c(3, 'a')]),
      (e) => e instanceof DomainError && e.code === 'COUNT_MISMATCH',
    );
  });

  it('Given weaker rank, When assertPlayable, Then NOT_HIGHER', () => {
    assert.throws(
      () => assertPlayable({ rank: 5, count: 2 }, [c(7, 'a'), c(7, 'b')]),
      (e) => e instanceof DomainError && e.code === 'NOT_HIGHER',
    );
  });
});
