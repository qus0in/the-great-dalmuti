import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';
import { joinRoom } from './room-join.js';
import { startGame } from './room-start.js';
import { runBotTurn } from './bot-turn.js';

const CLOCK = { now: () => new Date('2026-10-16T12:00:00Z') };

async function startedGame() {
  const gameRepository = createInMemoryGameRepository();
  const deps = { gameRepository, clock: CLOCK };
  const { game } = await createRoom(deps, { hostUser: { id: 'u0' } });
  for (const id of ['u1', 'u2', 'u3']) {
    await joinRoom(deps, { joinCode: game.joinCode, user: { id } });
  }
  const started = await startGame(
    { ...deps, rng: { random: () => 0.5 } },
    { joinCode: game.joinCode, user: { id: 'u0' } },
  );
  return { gameRepository, game: started.game, hands: started.hands };
}

// 지정 좌석을 봇으로 바꾼다 (빈자리·싱글 봇과 같은 모양)
async function withBots(gameRepository, game, seats) {
  const agg = await gameRepository.findGameByCode(game.joinCode);
  const next = agg.seats.map((s) =>
    seats.includes(s.seat) ? { ...s, userId: null, isBot: true } : s,
  );
  await gameRepository.saveSeats(game.id, next);
}

describe('Bot turn execution', () => {
  it('Given bot turn on lead, When runBotTurn, Then plays as that seat', async () => {
    const { gameRepository, game, hands } = await startedGame();
    await withBots(gameRepository, game, [0]);
    const result = await runBotTurn(
      { gameRepository },
      { code: game.joinCode },
    );

    assert.deepEqual(result, { acted: true, action: 'play' });
    const saved = await gameRepository.findHands(game.id);
    assert.ok(saved[0].length < hands[0].length);
    const agg = await gameRepository.findGameByCode(game.joinCode);
    assert.equal(agg.publicState.lastPlay.seat, 0);
  });

  it('Given delegated seat, When runBotTurn, Then executes for them', async () => {
    const { gameRepository, game, hands } = await startedGame();

    const result = await runBotTurn(
      {
        gameRepository,
        substitutions: { isSubstituted: (_code, seat) => seat === 0 },
      },
      { code: game.joinCode },
    );

    assert.equal(result.acted, true);
    const saved = await gameRepository.findHands(game.id);
    assert.ok(saved[0].length < hands[0].length);
  });
});

describe('Bot turn no-op', () => {
  it('Given human turn, When runBotTurn, Then does nothing', async () => {
    const { gameRepository, game, hands } = await startedGame();

    const result = await runBotTurn(
      { gameRepository },
      { code: game.joinCode },
    );

    assert.deepEqual(result, { acted: false });
    const saved = await gameRepository.findHands(game.id);
    assert.equal(saved[0].length, hands[0].length);
    const agg = await gameRepository.findGameByCode(game.joinCode);
    assert.equal(agg.game.version, game.version);
  });

  it('Given finished game, When runBotTurn, Then does nothing', async () => {
    const { gameRepository, game } = await startedGame();
    const agg = await gameRepository.findGameByCode(game.joinCode);
    await gameRepository.saveGameAndPublic({
      game: { ...agg.game, phase: 'finished' },
      publicState: { ...agg.publicState, phase: 'finished' },
      expectedVersion: game.version,
    });

    const result = await runBotTurn(
      { gameRepository },
      { code: game.joinCode },
    );

    assert.deepEqual(result, { acted: false });
  });
});
