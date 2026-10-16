import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';
import { joinRoom } from './room-join.js';
import { startGame } from './room-start.js';
import { playCards } from './play-actions.js';

async function startedGame() {
  const gameRepository = createInMemoryGameRepository();
  const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
  const { game } = await createRoom(
    { gameRepository, clock },
    { hostUser: { id: 'u0', name: '방장' } },
  );
  for (const id of ['u1', 'u2', 'u3']) {
    await joinRoom(
      { gameRepository, clock },
      { joinCode: game.joinCode, user: { id } },
    );
  }
  const started = await startGame(
    { gameRepository, clock, rng: { random: () => 0.5 } },
    { joinCode: game.joinCode, user: { id: 'u0' } },
  );
  return { gameRepository, clock, game: started.game };
}

describe('Play cards rule violation', () => {
  it('Given empty cards, When playCards, Then DomainError EMPTY_PLAY', async () => {
    const { gameRepository, clock, game } = await startedGame();
    await assert.rejects(
      () =>
        playCards(
          { gameRepository, clock },
          {
            code: game.joinCode,
            user: { id: 'u0' },
            cards: [],
            version: game.version,
          },
        ),
      (err) => err.name === 'DomainError' && err.code === 'EMPTY_PLAY',
    );
  });
});
