import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CLOCK,
  fourRows,
  playingGame,
  saveFinishedTrick,
} from './round-fixtures.js';
import { advanceAfterTrick } from './round-advance.js';

describe('Advance after trick winner lead', () => {
  it('Given finished trick, When advance, Then winner leads new trick', async () => {
    const { gameRepository, game, hands } = await playingGame();
    const played = hands[0][0];
    hands[0] = hands[0].slice(1);
    await saveFinishedTrick(gameRepository, game, {
      hands,
      plays: fourRows(played),
    });

    const result = await advanceAfterTrick(
      { gameRepository, clock: CLOCK },
      { code: game.joinCode },
    );

    assert.equal(result.advanced, true);
    assert.equal(result.roundEnded, false);
    const latest = await gameRepository.findLatestTrick(game.id);
    assert.equal(latest.seq, 2);
    assert.equal(latest.leaderSeat, 0);
    assert.equal(latest.winnerSeat, null);
    assert.equal(result.publicState.currentTurnSeat, 0);
    assert.equal(result.game.version, game.version + 1);
  });
});

describe('Advance after trick out ordering', () => {
  it('Given emptied seat, When advance, Then finish position recorded', async () => {
    const { gameRepository, game, hands } = await playingGame();
    const played = hands[0][0];
    hands[0] = [];
    await saveFinishedTrick(gameRepository, game, {
      hands,
      plays: fourRows(played),
    });

    const result = await advanceAfterTrick(
      { gameRepository, clock: CLOCK },
      { code: game.joinCode },
    );

    assert.equal(result.advanced, true);
    const agg = await gameRepository.findGameByCode(game.joinCode);
    assert.equal(agg.seats[0].finishPosition, 1);
    const latest = await gameRepository.findLatestTrick(game.id);
    assert.equal(latest.leaderSeat, 1);
    assert.equal(result.publicState.currentTurnSeat, 1);
  });
});
