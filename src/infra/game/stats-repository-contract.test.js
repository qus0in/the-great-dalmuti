import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assignRanksByFinishOrder } from '../../domain/game/ranking.js';
import { recordGameResults } from '../../app/game/stats-record.js';
import { createSupabaseGameRepository } from './supabase-game-repository.js';
import { createMockClient } from './mock-client.test-helper.js';

const finishedGame = {
  game: { id: 'g1', phase: 'finished' },
  seats: [0, 1, 2, 3].map((seat) => ({ seat, userId: `u${seat}` })),
};

function repositoryFor(writes) {
  const adapter = createSupabaseGameRepository({
    client: createMockClient({ store: writes }),
  });
  return { ...adapter, findGameById: () => Promise.resolve(finishedGame) };
}

async function saveRankings(rankings) {
  const writes = [];
  await recordGameResults(
    { gameRepository: repositoryFor(writes) },
    { gameId: 'g1', rankings },
  );
  return writes;
}

describe('U13 rank names through U9 into the Supabase adapter', () => {
  it('writes the four SQL rank ordinals from actual assigned rank names', async () => {
    const rankings = assignRanksByFinishOrder(['0', '1', '2', '3']);
    const writes = await saveRankings(rankings);
    assert.deepEqual(
      writes[0].data.map(({ rank }) => rank),
      [1, 2, 3, 4],
    );
  });

  it('keeps integer rank values for existing callers', async () => {
    const writes = [];
    const repository = createSupabaseGameRepository({
      client: createMockClient({ store: writes }),
    });
    await repository.saveResults(
      'g1',
      [1, 2, 3, 4].map((rank, index) => ({
        userId: `u${index}`,
        mode: 'multi',
        rank,
      })),
    );

    assert.deepEqual(
      writes[0].data.map(({ rank }) => rank),
      [1, 2, 3, 4],
    );
  });
});
