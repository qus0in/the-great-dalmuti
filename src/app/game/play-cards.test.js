import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';
import { joinRoom } from './room-join.js';
import { startGame } from './room-start.js';
import { ConflictError } from './room-errors.js';
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
  return { gameRepository, clock, game: started.game, hands: started.hands };
}

async function expectPlayRejects({ userId, seat, stale }, check) {
  const { gameRepository, clock, game, hands } = await startedGame();
  await assert.rejects(
    () =>
      playCards(
        { gameRepository, clock },
        {
          code: game.joinCode,
          user: { id: userId },
          cards: [hands[seat][0].id],
          version: stale ? 999 : game.version,
        },
      ),
    check,
  );
}

describe('Play cards happy path', () => {
  it('Given host turn, When playCards one card, Then hand and public update', async () => {
    const { gameRepository, clock, game, hands } = await startedGame();
    const card = hands[0][0];

    const result = await playCards(
      { gameRepository, clock },
      {
        code: game.joinCode,
        user: { id: 'u0' },
        cards: [card.id],
        version: game.version,
      },
    );

    assert.equal(result.game.version, game.version + 1);
    assert.equal(result.publicState.lastPlay.seat, 0);
    assert.equal(result.publicState.lastPlay.count, 1);
    assert.equal(result.publicState.seatSummary[0].cardCount, 19);
    assert.equal(result.trickEnded, false);
    const saved = await gameRepository.findHands(game.id);
    assert.equal(saved[0].length, 19);
    const pub = (await gameRepository.findGameByCode(game.joinCode))
      .publicState;
    assert.equal(pub.lastPlay.cards, undefined);
    assert.ok(!JSON.stringify(pub).includes(card.id));
  });
});

describe('Play cards conflicts', () => {
  it('Given stale version, When playCards, Then ConflictError STALE_VERSION', async () => {
    await expectPlayRejects({ userId: 'u0', seat: 0, stale: true }, (err) => {
      return err instanceof ConflictError && err.code === 'STALE_VERSION';
    });
  });

  it('Given other turn, When playCards, Then NOT_YOUR_TURN domain error', async () => {
    await expectPlayRejects({ userId: 'u1', seat: 1 }, (err) => {
      return err.name === 'DomainError' && err.code === 'NOT_YOUR_TURN';
    });
  });
});
