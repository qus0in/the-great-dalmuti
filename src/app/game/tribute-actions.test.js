import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { submitTribute } from './tribute-actions.js';
import { setupTributeFixture } from './tribute-test-fixture.js';

describe('Tribute exchange execution and state update', () => {
  it('Given valid hands and returns, When submitTribute called, Then exchanges cards and increments version', async () => {
    const { gameRepository, cards } = await setupTributeFixture();
    const result = await submitTribute(
      {
        gameRepository,
        clock: { now: () => new Date('2026-10-16T12:05:00.000Z') },
      },
      {
        code: 'ROOM1',
        user: { id: 'u-gd' },
        returns: {
          대달무티: [cards.gd[0], cards.gd[1]],
          소달무티: [cards.ld[0]],
        },
        version: 1,
      },
    );

    assert.equal(result.game.version, 2);
    assert.equal(result.game.phase, 'playing');
    assert.equal(result.publicState.version, 2);
    assert.deepEqual(result.publicState.tribute, {
      greaterCount: 2,
      lesserCount: 1,
    });
    assert.ok(result.hands[0].some((c) => c.rank === 1));
    assert.ok(result.hands[3].some((c) => c.rank === 10));
  });
});

describe('Tribute public state privacy', () => {
  it('Given publicState, When tribute completes, Then hides card details and preserves seat summary counts', async () => {
    const { gameRepository, cards } = await setupTributeFixture();
    const result = await submitTribute(
      { gameRepository },
      {
        joinCode: 'ROOM1',
        user: { id: 'u-gd' },
        returns: {
          대달무티: [cards.gd[0], cards.gd[1]],
          소달무티: [cards.ld[0]],
        },
        version: 1,
      },
    );

    const publicJson = JSON.stringify(result.publicState);
    assert.equal(publicJson.includes('rank-'), false);
    assert.equal(publicJson.includes('양치기'), false);
    assert.equal(result.publicState.seatSummary[0].cardCount, 3);
    assert.equal(result.publicState.seatSummary[3].cardCount, 3);
  });
});
