import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { CLOCK, finishedGame } from './stats-fixtures.js';
import { recordGameResults } from './stats-record.js';
import { getMyStats } from './stats-query.js';

async function recordTwoGames() {
  const gameRepository = createInMemoryGameRepository();
  const first = await finishedGame({ repository: gameRepository });
  await recordGameResults(
    { gameRepository, clock: CLOCK },
    { gameId: first.game.id, rankings: first.rankings },
  );
  const second = await finishedGame({ repository: gameRepository });
  const reversed = second.rankings.map((r) => ({
    playerId: r.playerId,
    rank: 5 - r.rank,
  }));
  await recordGameResults(
    { gameRepository, clock: CLOCK },
    { gameId: second.game.id, rankings: reversed },
  );
  return gameRepository;
}

describe('My stats query', () => {
  it('Given two finished games, When getMyStats, Then own aggregates only', async () => {
    const gameRepository = await recordTwoGames();

    const mine = await getMyStats({ gameRepository }, { user: { id: 'u0' } });

    assert.deepEqual(mine, [
      {
        user_id: 'u0',
        mode: 'multi',
        total_games: 2,
        rank_1_count: 1,
        rank_2_count: 0,
        rank_3_count: 0,
        rank_4_count: 1,
      },
    ]);
  });

  it('Given another user, When getMyStats, Then their rows only', async () => {
    const gameRepository = await recordTwoGames();

    const theirs = await getMyStats({ gameRepository }, { user: { id: 'u2' } });

    assert.deepEqual(
      theirs.map((r) => [r.user_id, r.total_games, r.rank_2_count]),
      [['u2', 2, 1]],
    );
  });

  it('Given user with no results, When getMyStats, Then empty list', async () => {
    const { gameRepository } = await finishedGame();

    const none = await getMyStats({ gameRepository }, { user: { id: 'u9' } });

    assert.deepEqual(none, []);
  });
});
