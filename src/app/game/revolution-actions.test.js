import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCard } from '../../domain/game/cards.js';
import { declareRevolution } from './revolution-actions.js';
import { setupTributeFixture } from './tribute-test-fixture.js';

describe('Standard revolution declaration', () => {
  it('Given non-peon with 2 jesters, When declareRevolution called, Then skips tribute without inverting seats', async () => {
    const j1 = createCard(13, 1);
    const j2 = createCard(13, 2);
    const handsOverride = {
      0: [createCard(1, 1)],
      1: [j1, j2, createCard(10, 1)],
      2: [createCard(2, 1)],
      3: [createCard(3, 1)],
    };
    const { gameRepository } = await setupTributeFixture({ handsOverride });

    const result = await declareRevolution(
      { gameRepository },
      { code: 'ROOM1', user: { id: 'u-ld' }, version: 1 },
    );

    assert.equal(result.game.phase, 'playing');
    assert.equal(result.game.version, 2);
    assert.equal(result.revolution.isRevolution, true);
    assert.equal(result.revolution.isGreaterRevolution, false);
    assert.equal(result.publicState.revolution.isRevolution, true);
    assert.equal(result.seats[0].rank, '대달무티');
  });
});

describe('Greater revolution (대혁명) declaration', () => {
  it('Given 대농노 holding 2 jesters, When declareRevolution called, Then inverts seats and saves them', async () => {
    const j1 = createCard(13, 1);
    const j2 = createCard(13, 2);
    const handsOverride = {
      0: [createCard(1, 1)],
      1: [createCard(5, 1)],
      2: [createCard(6, 1)],
      3: [j1, j2, createCard(12, 1)],
    };
    const { gameRepository } = await setupTributeFixture({ handsOverride });

    const result = await declareRevolution(
      { gameRepository },
      { code: 'ROOM1', user: { id: 'u-gp' }, version: 1 },
    );

    assert.equal(result.game.version, 2);
    assert.equal(result.revolution.isGreaterRevolution, true);
    assert.equal(result.seats[0].rank, '대농노');
    assert.equal(result.seats[3].rank, '대달무티');

    const agg = await gameRepository.findGameByCode('ROOM1');
    assert.equal(agg.seats[0].rank, '대농노');
    assert.equal(agg.seats[3].rank, '대달무티');
  });
});
