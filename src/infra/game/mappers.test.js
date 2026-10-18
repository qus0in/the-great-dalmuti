import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  gameToRow,
  rowToGame,
  seatToRow,
  rowToSeat,
  publicToRow,
  rowToPublic,
  handsToRows,
  rowsToHands,
} from './mappers.js';

describe('Game mappers', () => {
  it('Given game entity, When gameToRow called, Then converts to snake_case row', () => {
    const game = {
      id: 'g1',
      joinCode: 'CODE12',
      phase: 'waiting',
      version: 1,
      hostSeat: 0,
      createdAt: '2026-10-16T12:00:00Z',
      updatedAt: '2026-10-16T12:00:00Z',
    };
    const row = gameToRow(game);
    assert.equal(row.join_code, 'CODE12');
    assert.equal(row.host_seat, 0);

    const convertedBack = rowToGame(row);
    assert.deepEqual(convertedBack, game);
  });
});

describe('Seat mappers', () => {
  it('Given seat entity, When seatToRow called, Then converts to snake_case row', () => {
    const seat = {
      gameId: 'g1',
      seat: 2,
      userId: 'u2',
      isBot: false,
      finishPosition: null,
      leftAt: null,
    };
    const row = seatToRow(seat);
    assert.equal(row.game_id, 'g1');
    assert.equal(row.user_id, 'u2');

    const back = rowToSeat(row);
    assert.equal(back.gameId, 'g1');
    assert.equal(back.seat, 2);
  });
});

describe('Public state mappers', () => {
  it('Given public state, When publicToRow called, Then converts to snake_case row', () => {
    const pub = {
      gameId: 'g1',
      phase: 'playing',
      version: 2,
      currentTurnSeat: 1,
      seatSummary: [
        {
          seat: 0,
          userId: 'u0',
          userName: 'Dalmuti',
          isBot: false,
          cardCount: 20,
        },
      ],
      lastPlay: null,
      updatedAt: '2026-10-16T12:00:00Z',
    };
    const row = publicToRow(pub);
    assert.equal(row.current_turn_seat, 1);
    assert.deepEqual(rowToPublic(row), pub);
  });
});

describe('Hands mappers', () => {
  it('Given hands record, When handsToRows called, Then converts to array of rows and back', () => {
    const hands = {
      0: [{ id: '1-1' }],
      1: [{ id: '2-1' }],
    };
    const rows = handsToRows('g1', hands);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].seat, 0);

    const back = rowsToHands(rows);
    assert.deepEqual(back, hands);
  });
});
