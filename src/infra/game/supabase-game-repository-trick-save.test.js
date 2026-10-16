import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSupabaseGameRepository,
  SupabaseError,
} from './supabase-game-repository.js';
import { createMockClient } from './mock-client.test-helper.js';

describe('Supabase repository saveTrick with plays', () => {
  it('Given trick with plays, When saveTrick called, Then upserts trick and plays with onConflict', async () => {
    const store = [];
    const client = createMockClient({ store });
    const repo = createSupabaseGameRepository({ client });
    const trick = {
      id: 't3',
      gameId: 'g1',
      seq: 3,
      leaderSeat: 2,
      passes: 0,
      winnerSeat: null,
      plays: [{ turnNo: 1, seat: 2, action: 'play', cards: [{ id: '7' }] }],
    };

    await repo.saveTrick('g1', trick);
    assert.equal(store.length, 2);
    assert.equal(store[0].table, 'game_tricks');
    assert.equal(store[1].table, 'game_trick_plays');
    assert.deepEqual(store[1].opts, { onConflict: 'trick_id,turn_no' });
  });
});

describe('Supabase repository saveTrick without plays', () => {
  it('Given trick without plays, When saveTrick called, Then only upserts trick', async () => {
    const store = [];
    const client = createMockClient({ store });
    const repo = createSupabaseGameRepository({ client });
    await repo.saveTrick('g1', {
      id: 't4',
      gameId: 'g1',
      seq: 4,
      leaderSeat: 0,
      passes: 0,
      winnerSeat: null,
      plays: [],
    });
    assert.equal(store.length, 1);
    assert.equal(store[0].table, 'game_tricks');
  });
});

describe('Supabase repository saveTrick error handling', () => {
  it('Given client error, When saveTrick executed, Then throws SupabaseError', async () => {
    const client = createMockClient({
      error: { message: 'Database write error' },
    });
    const repo = createSupabaseGameRepository({ client });
    await assert.rejects(
      () => repo.saveTrick('g1', { id: 't5', gameId: 'g1', plays: [] }),
      (err) => err instanceof SupabaseError && err.code === 'SUPABASE_ERROR',
    );
  });
});
