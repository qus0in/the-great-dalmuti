import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSupabaseGameRepository,
  SupabaseError,
} from './supabase-game-repository.js';
import { createMockClient } from './mock-client.test-helper.js';

const mockTables = {
  games: [
    {
      id: 'g1',
      join_code: 'JOIN01',
      phase: 'waiting',
      version: 1,
      host_seat: 0,
    },
  ],
  game_seats: [{ game_id: 'g1', seat: 0, user_id: 'u1', is_bot: false }],
  game_public: [
    { game_id: 'g1', phase: 'waiting', version: 1, current_turn_seat: null },
  ],
};

describe('Supabase repository findGameByCode success', () => {
  it('Given existing join_code, When findGameByCode, Then returns GameAggregate', async () => {
    const client = createMockClient({ tables: mockTables });
    const repo = createSupabaseGameRepository({ client });
    const result = await repo.findGameByCode('JOIN01');

    assert.ok(result);
    assert.equal(result.game.id, 'g1');
    assert.equal(result.seats.length, 1);
  });
});

describe('Supabase repository findGameByCode missing', () => {
  it('Given non-existent code, When findGameByCode, Then returns null', async () => {
    const client = createMockClient({ tables: { games: [] } });
    const repo = createSupabaseGameRepository({ client });
    const result = await repo.findGameByCode('MISSING');
    assert.equal(result, null);
  });
});

describe('Supabase repository query error', () => {
  it('Given client error, When query executed, Then throws SupabaseError', async () => {
    const client = createMockClient({
      error: { message: 'Database connection failed' },
    });
    const repo = createSupabaseGameRepository({ client });

    await assert.rejects(
      async () => {
        await repo.findGameByCode('C1');
      },
      (err) => err instanceof SupabaseError && err.code === 'SUPABASE_ERROR',
    );
  });
});
