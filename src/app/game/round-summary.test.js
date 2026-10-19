import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOCK,
  fourRows,
  playingGame,
  saveFinishedTrick,
} from './round-fixtures.js';
import { advanceAfterTrick } from './round-advance.js';
import { mergeSummaryPositions } from './round-support.js';

async function seedRoundEnd(repo, game, hands) {
  const agg = await repo.findGameByCode(game.joinCode);
  const seeded = agg.seats.map((s) => ({
    ...s,
    finishPosition: s.seat === 1 || s.seat === 2 ? s.seat : null,
  }));
  await repo.saveSeats(game.id, seeded);
  await repo.saveHands(game.id, { ...hands, 0: [], 1: [], 2: [] });
  await repo.saveTrick(game.id, {
    id: 'trick-1',
    gameId: game.id,
    seq: 1,
    leaderSeat: 0,
    passes: 0,
    winnerSeat: null,
    plays: [{ turnNo: 1, seat: 0, action: 'play', cards: [hands[0][0]] }],
  });
}

describe('Advance summary while playing', () => {
  it('Given out seat, When advance, Then summary keeps position', async () => {
    const { gameRepository, game, hands } = await playingGame();
    await saveFinishedTrick(gameRepository, game, {
      hands: { ...hands, 0: [] },
      plays: fourRows(hands[0][0]),
    });
    const result = await advanceAfterTrick(
      { gameRepository, clock: CLOCK },
      { code: game.joinCode },
    );
    assert.equal(
      result.publicState.seatSummary.find((s) => s.seat === 0).finishPosition,
      1,
    );
  });
});

describe('Advance summary when finished', () => {
  it('Given last trick, When advance, Then summary has four positions', async () => {
    const { gameRepository, game, hands } = await playingGame();
    await seedRoundEnd(gameRepository, game, hands);
    const result = await advanceAfterTrick(
      { gameRepository, clock: CLOCK },
      { code: game.joinCode },
    );
    const positions = result.publicState.seatSummary
      .map((s) => s.finishPosition)
      .sort((a, b) => a - b);
    assert.deepEqual(positions, [1, 2, 3, 4]);
  });
});

describe('Merge summary positions', () => {
  it('Given seats, When merge, Then summary gains positions', () => {
    const merged = mergeSummaryPositions(
      [{ seat: 0 }, { seat: 1 }],
      [{ seat: 0, finishPosition: 2 }],
    );
    assert.deepEqual(
      merged.map((s) => s.finishPosition),
      [2, null],
    );
  });
});
