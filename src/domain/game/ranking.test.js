import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEAT_RANKS,
  RANK_GREATER_DALMUTI,
  RANK_LESSER_DALMUTI,
  RANK_LESSER_PEON,
  RANK_GREATER_PEON,
  getRankByFinishPosition,
  assignRanksByFinishOrder,
  drawInitialSeats,
} from './ranking.js';
import { DomainError } from './cards.js';

describe('Seat rank constants and positions', () => {
  it('Given SEAT_RANKS, When inspected, Then matches DESIGN.md 3.5', () => {
    assert.deepEqual(SEAT_RANKS, [
      RANK_GREATER_DALMUTI,
      RANK_LESSER_DALMUTI,
      RANK_LESSER_PEON,
      RANK_GREATER_PEON,
    ]);
    assert.deepEqual(SEAT_RANKS, ['대달무티', '소달무티', '소농노', '대농노']);
  });

  it('Given positions, When getRankByFinishPosition called, Then maps or throws', () => {
    assert.equal(getRankByFinishPosition(1), '대달무티');
    assert.equal(getRankByFinishPosition(2), '소달무티');
    assert.equal(getRankByFinishPosition(3), '소농노');
    assert.equal(getRankByFinishPosition(4), '대농노');
    assert.throws(
      () => getRankByFinishPosition(0),
      (err) => err instanceof DomainError && err.code === 'INVALID_POSITION',
    );
  });
});

describe('Assign ranks by finish order', () => {
  it('Given 4 players, When assignRanksByFinishOrder called, Then assigns seats', () => {
    const players = ['alice', 'bob', 'charlie', 'david'];
    const assigned = assignRanksByFinishOrder(players);
    assert.equal(assigned[0].rank, '대달무티');
    assert.equal(assigned[0].player, 'alice');
    assert.equal(assigned[3].rank, '대농노');
    assert.equal(assigned[3].player, 'david');

    const objs = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }];
    const resObjs = assignRanksByFinishOrder(objs);
    assert.equal(resObjs[0].id, 'p1');
    assert.equal(resObjs[0].rank, '대달무티');
  });

  it('Given invalid players, When called, Then throws DomainError', () => {
    assert.throws(
      () => assignRanksByFinishOrder(['p1', 'p2', 'p3']),
      (err) =>
        err instanceof DomainError && err.code === 'INVALID_PLAYER_COUNT',
    );
    assert.throws(
      () => assignRanksByFinishOrder(['p1', 'p2', 'p3', 'p1']),
      (err) => err instanceof DomainError && err.code === 'DUPLICATE_PLAYERS',
    );
  });
});

describe('Draw initial seats', () => {
  it('Given 4 players and injected rng, When drawInitialSeats called, Then assigns deterministically', () => {
    const players = ['p1', 'p2', 'p3', 'p4'];
    const assigned = drawInitialSeats(players, () => 0);
    assert.equal(assigned.length, 4);
    assert.equal(assigned[0].rank, '대달무티');
    assert.equal(assigned[3].rank, '대농노');
    assert.throws(
      () => drawInitialSeats(['p1', 'p2']),
      (err) =>
        err instanceof DomainError && err.code === 'INVALID_PLAYER_COUNT',
    );
  });
});
