import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { trickToRow, rowToTrick, playToRow } from './trick-mappers.js';

const sampleTrick = {
  id: 't-1',
  gameId: 'g-1',
  seq: 2,
  leaderSeat: 1,
  passes: 0,
  winnerSeat: null,
  plays: [{ turnNo: 1, seat: 1, action: 'play', cards: [{ id: 'c1' }] }],
};

describe('Trick mapper trickToRow and playToRow', () => {
  it('Given trick entity, When trickToRow called, Then converts to row', () => {
    const row = trickToRow(sampleTrick);
    assert.deepEqual(row, {
      id: 't-1',
      game_id: 'g-1',
      seq: 2,
      leader_seat: 1,
      passes: 0,
      winner_seat: null,
    });
    const playRow = playToRow(sampleTrick.id, sampleTrick.plays[0]);
    assert.deepEqual(playRow, {
      trick_id: 't-1',
      turn_no: 1,
      seat: 1,
      action: 'play',
      cards: [{ id: 'c1' }],
    });
  });
});

describe('Trick mapper rowToTrick restoration and sorting', () => {
  it('Given row and playRows, When rowToTrick called, Then restores entity', () => {
    const row = trickToRow(sampleTrick);
    const playRow = playToRow(sampleTrick.id, sampleTrick.plays[0]);
    const entity = rowToTrick(row, [playRow]);
    assert.deepEqual(entity, sampleTrick);
  });

  it('Given unsorted plays, When rowToTrick called, Then sorts plays by turnNo', () => {
    const row = {
      id: 't-2',
      game_id: 'g-1',
      seq: 1,
      leader_seat: 0,
      passes: 3,
      winner_seat: 0,
    };
    const playRows = [
      { turn_no: 2, seat: 1, action: 'pass', cards: [] },
      { turn_no: 1, seat: 0, action: 'play', cards: [{ id: 'c2' }] },
    ];
    const entity = rowToTrick(row, playRows);
    assert.equal(entity.plays[0].turnNo, 1);
    assert.equal(entity.plays[1].turnNo, 2);
    assert.equal(entity.winnerSeat, 0);
  });
});
