import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CLOCK, playingGame } from './round-fixtures.js';
import { advanceAfterTrick } from './round-advance.js';
import { finishRound } from './round-finish.js';

// 라운드 종료 직전 상태를 만든다: 0번이 마지막 카드를 내고, 1·2번은 이미 아웃
async function seedRoundEnd(repo, game, { hands, played }) {
  const empty = { ...hands, 0: [], 1: [], 2: [] };
  await repo.saveHands(game.id, empty);
  const agg = await repo.findGameByCode(game.joinCode);
  const seats = agg.seats.map((seat) => ({
    ...seat,
    finishPosition:
      seat.seat === 1 || seat.seat === 2 ? seat.seat : seat.finishPosition,
  }));
  await repo.saveSeats(game.id, seats);
  await repo.saveTrick(game.id, {
    id: 'trick-1',
    gameId: game.id,
    seq: 1,
    leaderSeat: 0,
    passes: 0,
    winnerSeat: null,
    plays: [{ turnNo: 1, seat: 0, action: 'play', cards: [played] }],
  });
}

describe('Advance round end and rankings', () => {
  it('Given one active seat left, When advance, Then ranks and phase', async () => {
    const { gameRepository, game, hands } = await playingGame();
    await seedRoundEnd(gameRepository, game, { hands, played: hands[0][0] });

    const result = await advanceAfterTrick(
      { gameRepository, clock: CLOCK },
      { code: game.joinCode },
    );

    assert.equal(result.advanced, true);
    assert.equal(result.roundEnded, true);
    assert.equal(result.publicState.phase, 'finished');
    assert.deepEqual(
      result.rankings.map((r) => [r.playerId, r.rank]),
      [
        [1, '대달무티'],
        [2, '소달무티'],
        [0, '소농노'],
        [3, '대농노'],
      ],
    );
    const agg = await gameRepository.findGameByCode(game.joinCode);
    assert.equal(agg.seats[0].finishPosition, 3);
    assert.equal(agg.seats[3].finishPosition, 4);
  });
});

describe('Finish round immutability', () => {
  it('Given one unfinished seat, When ranks are assigned, Then inputs stay unchanged', async () => {
    const seats = [0, 1, 2, 3].map((seat) => ({
      seat,
      finishPosition: seat === 3 ? null : seat + 1,
    }));
    const before = seats.map((seat) => ({ ...seat }));

    const rankings = await finishRound({
      gameRepository: { saveTrick: async () => {} },
      game: { id: 'game-1' },
      seats,
      latest: { id: 'trick-1' },
      state: { trick: { lastPlay: { playerId: '3' } } },
    });

    assert.deepEqual(seats, before);
    assert.deepEqual(
      rankings.map(({ playerId, rank }) => [playerId, rank]),
      [
        [0, '대달무티'],
        [1, '소달무티'],
        [2, '소농노'],
        [3, '대농노'],
      ],
    );
  });
});
