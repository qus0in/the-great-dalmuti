import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCard } from '../../domain/game/cards.js';
import { chooseBotAction } from './bot-choose.js';

const ids = (cards) => cards.map((c) => c.id);

describe('Bot lead choice', () => {
  it('Given lead, When choose, Then plays whole lowest group', () => {
    const low = [createCard(9, 1), createCard(9, 2)];
    const lower = [createCard(3, 1), createCard(3, 2)];
    const result = chooseBotAction([...low, ...lower], { lastPlay: null });
    assert.equal(result.action, 'play');
    assert.deepEqual(result.cards, ids(lower));
  });

  it('Given empty hand on lead, When choose, Then passes', () => {
    assert.deepEqual(chooseBotAction([], { lastPlay: null }), {
      action: 'pass',
    });
  });
});

describe('Bot follow choice', () => {
  it('Given beatable trick, When choose, Then plays lowest-number combo', () => {
    const rank8 = [createCard(8, 1), createCard(8, 2)];
    const rank2 = [createCard(2, 1), createCard(2, 2)];
    const hand = [...rank8, ...rank2];
    const result = chooseBotAction(hand, {
      lastPlay: { rank: 10, count: 2 },
    });
    assert.equal(result.action, 'play');
    assert.deepEqual(result.cards, ids(rank2));
  });

  it('Given bigger group than needed, When choose, Then plays first N', () => {
    const trio = [createCard(5, 1), createCard(5, 2), createCard(5, 3)];
    const result = chooseBotAction(trio, { lastPlay: { rank: 9, count: 2 } });
    assert.equal(result.action, 'play');
    assert.deepEqual(result.cards, ids(trio.slice(0, 2)));
  });

  it('Given nothing beats, When choose, Then passes', () => {
    const hand = [createCard(11, 1), createCard(12, 1)];
    const result = chooseBotAction(hand, { lastPlay: { rank: 3, count: 1 } });
    assert.deepEqual(result.action, 'pass');
  });
});
