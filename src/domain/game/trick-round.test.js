import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTrickState, play } from './trick.js';
import { createCard, DomainError } from './cards.js';

describe('Round end and finish order accumulation', () => {
  it('Given players emptying hands sequentially, When 1 player remains, Then finishes round', () => {
    let s = createTrickState({
      playerOrder: ['p1', 'p2', 'p3', 'p4'],
      leaderId: 'p1',
      handCounts: { p1: 1, p2: 1, p3: 1, p4: 1 },
    });
    s = play(s, 'p1', { rank: 10, count: 1 });
    assert.deepEqual(s.finishOrder, ['p1']);

    s = play(s, 'p2', { rank: 9, count: 1 });
    assert.deepEqual(s.finishOrder, ['p1', 'p2']);

    s = play(s, 'p3', { rank: 8, count: 1 });
    assert.equal(s.status, 'round-ended');
    assert.deepEqual(s.finishOrder, ['p1', 'p2', 'p3', 'p4']);
    assert.throws(
      () => play(s, 'p4', { rank: 7, count: 1 }),
      (err) => err instanceof DomainError && err.code === 'ROUND_ENDED',
    );
  });
});

describe('Real card array integration via play.js', () => {
  it('Given card array, When play is called, Then validates via play.js', () => {
    let s = createTrickState({
      playerOrder: ['p1', 'p2', 'p3', 'p4'],
      leaderId: 'p1',
      handCounts: { p1: 5, p2: 5, p3: 5, p4: 5 },
    });
    const c5a = createCard(5, 1);
    const c5b = createCard(5, 2);
    s = play(s, 'p1', [c5a, c5b]);
    assert.equal(s.trick.lastPlay.rank, 5);
    assert.equal(s.trick.lastPlay.count, 2);
    assert.equal(s.handCounts.p1, 3);

    const c4a = createCard(4, 1);
    const c4b = createCard(4, 2);
    s = play(s, 'p2', [c4a, c4b]);
    assert.equal(s.trick.lastPlay.rank, 4);

    const c6a = createCard(6, 1);
    const c6b = createCard(6, 2);
    assert.throws(
      () => play(s, 'p3', [c6a, c6b]),
      (err) => err instanceof DomainError && err.code === 'NOT_HIGHER',
    );
  });
});
