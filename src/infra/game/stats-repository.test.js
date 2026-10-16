import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSupabaseGameRepository,
  SupabaseError,
} from './supabase-game-repository.js';
import { createMockClient } from './mock-client.test-helper.js';

const result = {
  gameId: 'g1',
  userId: 'u1',
  mode: 'multi',
  rank: 2,
  playedAt: '2026-10-16T12:00:00.000Z',
};
const expectedWrite = {
  table: 'game_results',
  op: 'upsert',
  data: [
    {
      game_id: 'g1',
      user_id: 'u1',
      mode: 'multi',
      rank: 2,
      played_at: '2026-10-16T12:00:00.000Z',
    },
  ],
  opts: { onConflict: 'game_id,user_id', ignoreDuplicates: true },
};

describe('Supabase game result persistence', () => {
  it('maps U9 rows and ignores duplicates by the SQL unique key', async () => {
    const writes = [];
    const repository = createSupabaseGameRepository({
      client: createMockClient({ store: writes }),
    });
    await repository.saveResults('g1', [result]);
    assert.deepEqual(writes, [expectedWrite]);
  });

  it('does not call Supabase for an empty result list', async () => {
    const writes = [];
    const repository = createSupabaseGameRepository({
      client: createMockClient({ store: writes }),
    });
    await repository.saveResults('g1', []);
    assert.deepEqual(writes, []);
  });
});

describe('Supabase user stats lookup', () => {
  it('returns only rows filtered for the requested user', async () => {
    const own = { user_id: 'u1', mode: 'single', total_games: 3 };
    const repository = createSupabaseGameRepository({
      client: createMockClient({
        tables: {
          user_game_stats: [
            own,
            { user_id: 'u2', mode: 'multi', total_games: 9 },
          ],
        },
      }),
    });
    assert.deepEqual(await repository.findStatsByUser('u1'), [own]);
  });

  it('maps persistence errors through SupabaseError', async () => {
    const repository = createSupabaseGameRepository({
      client: createMockClient({ error: { message: 'database unavailable' } }),
    });
    await assert.rejects(repository.saveResults('g1', [result]), SupabaseError);
    await assert.rejects(repository.findStatsByUser('u1'), SupabaseError);
  });
});
