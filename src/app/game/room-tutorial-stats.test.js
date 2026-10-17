import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';
import { startGame } from './room-start.js';
import { recordGameResults } from './stats-record.js';

describe('Tutorial results exclusion', () => {
  it('Given finished tutorial, When recording repeatedly, Then no result write occurs', async () => {
    const gameRepository = createInMemoryGameRepository();
    const deps = { gameRepository, rng: { random: () => 0.5 } };
    const hostUser = { id: 'host' };
    const created = await createRoom(deps, { hostUser, mode: 'tutorial' });
    const started = await startGame(deps, {
      joinCode: created.game.joinCode,
      user: hostUser,
    });
    await gameRepository.saveGameAndPublic({
      game: { ...started.game, phase: 'finished' },
      publicState: { ...started.publicState, phase: 'finished' },
      expectedVersion: started.game.version,
    });
    gameRepository.saveResults = () => assert.fail('must not write stats');
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await recordGameResults(deps, {
        gameId: created.game.id,
        rankings: [{ playerId: 0, rank: 1 }],
      });
      assert.equal(result.mode, 'tutorial');
      assert.deepEqual(result.rows, []);
    }
  });
});
