import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CLOCK, playingGame } from './round-fixtures.js';
import { advanceAfterTrick } from './round-advance.js';

// 라운드 종료 직전 상태를 만든다: 0번이 마지막 카드를 내고, 1·2번은 이미 아웃
async function seedRoundEnd(repo, game, { hands, played }) {
  const empty = { ...hands, 0: [], 1: [], 2: [] };
  await repo.saveHands(game.id, empty);
  const agg = await repo.findGameByCode(game.joinCode);
  agg.seats[1].finishPosition = 1;
  agg.seats[2].finishPosition = 2;
  await repo.saveSeats(game.id, agg.seats);
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
