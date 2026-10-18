import { it } from 'node:test';
import assert from 'node:assert/strict';
import { rowToPublic } from './mappers.js';

it('Given legacy public row, When restored, Then missing userId defaults to null', () => {
  const row = {
    game_id: 'g1',
    phase: 'playing',
    version: 2,
    current_turn_seat: 1,
    seat_summary: [
      { seat: 0, userName: 'Dalmuti', isBot: false, cardCount: 20 },
    ],
    last_play: null,
    updated_at: '2026-10-16T12:00:00Z',
  };

  const restored = rowToPublic(row);
  assert.deepEqual(restored.seatSummary, [
    {
      seat: 0,
      userId: null,
      userName: 'Dalmuti',
      isBot: false,
      cardCount: 20,
    },
  ]);
});
