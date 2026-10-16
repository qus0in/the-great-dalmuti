import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, shuffle } from './deck.js';
import { DomainError } from './cards.js';

describe('Deck creation', () => {
  it('Given cards foundation, When createDeck is called, Then it returns 80 cards with stable IDs', () => {
    const deck = createDeck();

    assert.equal(deck.length, 80);
    const ids = new Set(deck.map((card) => card.id));
    assert.equal(ids.size, 80);

    const dalmutiCards = deck.filter((c) => c.rank === 1);
    assert.equal(dalmutiCards.length, 1);

    const serfCards = deck.filter((c) => c.rank === 12);
    assert.equal(serfCards.length, 12);

    const jesters = deck.filter((c) => c.isJester);
    assert.equal(jesters.length, 2);
  });
});

describe('Deck shuffle', () => {
  it('Given a deck and deterministic RNG, When shuffle is called, Then returns shuffled copy without mutating original', () => {
    const originalDeck = createDeck();
    const clonedDeck = [...originalDeck];
    let counter = 0;
    const deterministicRng = () => {
      counter += 0.1;
      return counter % 1;
    };

    const shuffled = shuffle(originalDeck, deterministicRng);

    assert.notStrictEqual(shuffled, originalDeck);
    assert.deepEqual(originalDeck, clonedDeck);
    assert.equal(shuffled.length, 80);
    assert.notDeepEqual(shuffled, originalDeck);
  });

  it('Given invalid deck or RNG input, When shuffle is called, Then DomainError is thrown', () => {
    assert.throws(
      () => shuffle(null),
      (err) => err instanceof DomainError && err.code === 'INVALID_DECK',
    );
    assert.throws(
      () => shuffle([]),
      (err) => err instanceof DomainError && err.code === 'INVALID_DECK',
    );
    assert.throws(
      () => shuffle(createDeck(), 'not-a-function'),
      (err) => err instanceof DomainError && err.code === 'INVALID_RNG',
    );
  });
});
