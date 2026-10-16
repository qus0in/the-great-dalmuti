import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';
import { joinRoom } from './room-join.js';
import { startGame } from './room-start.js';
import { playCards, passTurn } from './play-actions.js';

async function playingGame() {
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

describe('Pass turn happy path', () => {
  it('Given follower turn, When passTurn, Then turn moves clockwise', async () => {
    const { gameRepository, clock, game, hands } = await playingGame();
    await playCards(
      { gameRepository, clock },
      {
        code: game.joinCode,
        user: { id: 'u0' },
        cards: [hands[0][0].id],
        version: game.version,
      },
    );
    const afterPlay = await gameRepository.findGameByCode(game.joinCode);

    const result = await passTurn(
      { gameRepository, clock },
      {
        code: game.joinCode,
        user: { id: 'u1' },
        version: afterPlay.game.version,
      },
    );

    assert.equal(result.trickEnded, false);
    assert.equal(result.publicState.currentTurnSeat, 2);
  });
});

describe('Pass turn trick ending signal', () => {
  it('Given all others pass, When last pass, Then trickEnded and trick closed', async () => {
    const { gameRepository, clock, game, hands } = await playingGame();
    const last = await playCards(
      { gameRepository, clock },
      {
        code: game.joinCode,
        user: { id: 'u0' },
        cards: [hands[0][0].id],
        version: game.version,
      },
    );
    let { version } = last.game;
    let result;
    for (const id of ['u1', 'u2', 'u3']) {
      result = await passTurn(
        { gameRepository, clock },
        { code: game.joinCode, user: { id }, version },
      );
      version = result.game.version;
    }

    assert.equal(result.trickEnded, true);
    assert.equal(result.publicState.currentTurnSeat, 0);
    // 결정 96: 트릭 종료 직후 서버가 다음 트릭(seq+1)을 열어 둔다
    const current = await gameRepository.findCurrentTrick(game.id);
    assert.ok(current);
    assert.equal(current.seq, 2);
    assert.equal(current.leaderSeat, 0);
    assert.equal(current.plays.length, 0);
  });
});
