import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCard, DomainError } from './cards.js';
import { selectTributeCards, exchangeTribute } from './tribute.js';

describe('Tribute card selection', () => {
  it('Given cards including jester, When selectTributeCards called, Then returns lowest rank cards', () => {
    const hand = [
      createCard(12, 1),
      createCard(5, 1),
      createCard(13, 1),
      createCard(2, 1),
    ];
    const best2 = selectTributeCards(hand, 2);
    assert.deepEqual(
      best2.map((c) => c.rank),
      [2, 5],
    );
    assert.equal(
      selectTributeCards([createCard(13, 1), createCard(12, 1)], 1)[0].rank,
      12,
    );
    assert.throws(
      () => selectTributeCards([createCard(1, 1)], 2),
      (err) => err instanceof DomainError && err.code === 'NOT_ENOUGH_CARDS',
    );
  });
});

function createTestHands() {
  const gd = [createCard(10, 1), createCard(11, 1), createCard(12, 1)];
  const ld = [createCard(10, 2), createCard(12, 2)];
  const lp = [createCard(12, 3), createCard(2, 1)];
  const gp = [createCard(12, 4), createCard(1, 1), createCard(3, 1)];
  return {
    hands: { 대달무티: gd, 소달무티: ld, 소농노: lp, 대농노: gp },
    returns: { 대달무티: [gd[0], gd[1]], 소달무티: [ld[0]] },
  };
}

describe('Tribute exchange execution and immutability', () => {
  it('Given hands and returns, When exchangeTribute called, Then trades simultaneously without mutation', () => {
    const { hands, returns } = createTestHands();
    const result = exchangeTribute({ hands, returns });

    assert.equal(result.hands.대달무티.length, 3);
    assert.equal(result.hands.소달무티.length, 2);
    assert.equal(result.hands.소농노.length, 2);
    assert.equal(result.hands.대농노.length, 3);
    assert.ok(result.hands.대달무티.some((c) => c.rank === 1));
    assert.ok(result.hands.대농노.some((c) => c.rank === 10));
    assert.ok(result.hands.소달무티.some((c) => c.rank === 2));
    assert.ok(result.hands.소농노.some((c) => c.rank === 10));
    assert.equal(hands.대달무티.length, 3);
    assert.equal(hands.대농노.length, 3);
  });
});

describe('Tribute validation errors', () => {
  it('Given invalid return count or missing card, When exchangeTribute called, Then throws DomainError', () => {
    const { hands } = createTestHands();
    assert.throws(
      () =>
        exchangeTribute({
          hands,
          returns: {
            대달무티: [hands.대달무티[0]],
            소달무티: [hands.소달무티[0]],
          },
        }),
      (err) => err instanceof DomainError && err.code === 'INVALID_CARD_COUNT',
    );
    assert.throws(
      () =>
        exchangeTribute({
          hands,
          returns: {
            대달무티: [createCard(1, 99), createCard(2, 99)],
            소달무티: [hands.소달무티[0]],
          },
        }),
      (err) => err instanceof DomainError && err.code === 'CARD_NOT_IN_HAND',
    );
  });
});
