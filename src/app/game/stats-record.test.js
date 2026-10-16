import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CLOCK, finishedGame } from './stats-fixtures.js';
import { recordGameResults } from './stats-record.js';

const depsFor = (gameRepository) => ({ gameRepository, clock: CLOCK });

describe('Record game results', () => {
  it('Given four humans finished, When record, Then rows in multi mode', async () => {
    const { gameRepository, game, rankings } = await finishedGame();

    const result = await recordGameResults(depsFor(gameRepository), {
      gameId: game.id,
      rankings,
    });

    assert.equal(result.mode, 'multi');
    assert.deepEqual(
      result.rows.map((r) => r.userId),
      ['u0', 'u1', 'u2', 'u3'],
    );
    assert.equal(result.rows[0].rank, 1);
  });
});

describe('Record game results bot seats', () => {
  it('Given bot seats, When record, Then no rows for bots and single mode', async () => {
    const { gameRepository, game, rankings } = await finishedGame({
      botSeats: [1, 2, 3],
    });

    const result = await recordGameResults(depsFor(gameRepository), {
      gameId: game.id,
      rankings,
    });

    assert.equal(result.mode, 'single');
    assert.deepEqual(
      result.rows.map((r) => r.userId),
      ['u0'],
    );
  });
});

describe('Record game results substitution', () => {
  it('Given substituted user, When record, Then that user is excluded', async () => {
    const { gameRepository, game, rankings } = await finishedGame();

    const result = await recordGameResults(depsFor(gameRepository), {
      gameId: game.id,
      rankings,
      substitutedUserIds: ['u1'],
    });

    assert.deepEqual(
      result.rows.map((r) => r.userId),
      ['u0', 'u2', 'u3'],
    );
  });
});
