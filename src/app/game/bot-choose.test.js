import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCard } from '../../domain/game/cards.js';
import { chooseBotPlay } from '../../domain/game/hint.js';

const ids = (cards) => cards.map((card) => card.id);

describe('Bot lead choice', () => {
  it('Given weak and strong groups, When leading, Then sheds the weak group', () => {
    const weak = [createCard(9, 1), createCard(9, 2)];
    const strong = [createCard(3, 1), createCard(3, 2)];
    const result = chooseBotPlay([...strong, ...weak]);

    assert.equal(result.action, 'play');
    assert.deepEqual(result.cards, ids(weak));
  });

  it('Given an empty hand, When leading, Then passes', () => {
    assert.deepEqual(chooseBotPlay([]), { action: 'pass' });
  });
});

describe('Bot follow choice', () => {
  it('Given several winning pairs, When following, Then saves stronger groups', () => {
    const weak = [createCard(8, 1), createCard(8, 2)];
    const strong = [createCard(2, 1), createCard(2, 2)];
    const result = chooseBotPlay([...strong, ...weak], { rank: 10, count: 2 });

    assert.equal(result.action, 'play');
    assert.deepEqual(result.cards, ids(weak));
  });

  it('Given a bigger group, When following, Then plays only the needed cards', () => {
    const trio = [createCard(5, 1), createCard(5, 2), createCard(5, 3)];
    const result = chooseBotPlay(trio, { rank: 9, count: 2 });

    assert.equal(result.action, 'play');
    assert.deepEqual(result.cards, ids(trio.slice(0, 2)));
  });

  it('Given no normal winner, When following, Then uses a jester mix', () => {
    const hand = [createCard(8, 1), createCard(13, 1)];
    const result = chooseBotPlay(hand, { rank: 10, count: 2 });

    assert.deepEqual(result.cards, ['rank-8-1', 'jester-1']);
  });

  it('Given nothing beats, When following, Then passes', () => {
    const result = chooseBotPlay([createCard(11, 1), createCard(12, 1)], {
      rank: 3,
      count: 1,
    });
    assert.deepEqual(result, { action: 'pass' });
  });
});
