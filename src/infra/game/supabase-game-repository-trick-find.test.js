import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createSupabaseGameRepository } from './supabase-game-repository.js';
import { createMockClient } from './mock-client.test-helper.js';

const sampleTricks = [
  {
    id: 't1',
    game_id: 'g1',
    seq: 1,
    leader_seat: 0,
    passes: 3,
    winner_seat: 0,
  },
  {
    id: 't2',
    game_id: 'g1',
    seq: 2,
    leader_seat: 0,
    passes: 1,
    winner_seat: null,
  },
];

const samplePlays = [
  {
    id: 'p1',
    trick_id: 't2',
    turn_no: 1,
    seat: 0,
    action: 'play',
    cards: [{ id: '1' }],
  },
  { id: 'p2', trick_id: 't2', turn_no: 2, seat: 1, action: 'pass', cards: [] },
];

describe('Supabase repository findCurrentTrick', () => {
  it('Given ongoing trick with plays, When findCurrentTrick, Then returns trick entity', async () => {
    const client = createMockClient({
      tables: { game_tricks: sampleTricks, game_trick_plays: samplePlays },
    });
    const repo = createSupabaseGameRepository({ client });
    const trick = await repo.findCurrentTrick('g1');

    assert.ok(trick);
    assert.equal(trick.id, 't2');
    assert.equal(trick.winnerSeat, null);
    assert.equal(trick.plays.length, 2);
    assert.equal(trick.plays[0].action, 'play');
  });

  it('Given no ongoing trick, When findCurrentTrick, Then returns null', async () => {
    const completed = [sampleTricks[0]];
    const client = createMockClient({ tables: { game_tricks: completed } });
    const repo = createSupabaseGameRepository({ client });
    const trick = await repo.findCurrentTrick('g1');
    assert.equal(trick, null);
  });
});

describe('Supabase repository findLatestTrick', () => {
  it('Given multiple tricks, When findLatestTrick, Then returns highest seq trick', async () => {
    const client = createMockClient({
      tables: { game_tricks: sampleTricks, game_trick_plays: samplePlays },
    });
    const repo = createSupabaseGameRepository({ client });
    const trick = await repo.findLatestTrick('g1');

    assert.ok(trick);
    assert.equal(trick.seq, 2);
  });
});
