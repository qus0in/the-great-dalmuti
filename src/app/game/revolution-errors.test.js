import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCard } from '../../domain/game/cards.js';
import { declareRevolution } from './revolution-actions.js';
import { setupTributeFixture } from './tribute-test-fixture.js';

describe('Revolution phase and version validation errors', () => {
  it('Given game in playing phase, When declareRevolution called, Then throws ConflictError (409)', async () => {
    const { gameRepository } = await setupTributeFixture({ phase: 'playing' });
    await assert.rejects(
      () =>
        declareRevolution(
          { gameRepository },
          { code: 'ROOM1', user: { id: 'u-gd' }, version: 1 },
        ),
      { name: 'ConflictError', code: 'CONFLICT' },
    );
  });

  it('Given stale version, When declareRevolution called, Then throws ConflictError (409)', async () => {
    const { gameRepository } = await setupTributeFixture({ version: 2 });
    await assert.rejects(
      () =>
        declareRevolution(
          { gameRepository },
          { code: 'ROOM1', user: { id: 'u-gd' }, version: 1 },
        ),
      { name: 'ConflictError', code: 'STALE_VERSION' },
    );
  });
});

describe('Revolution authorization errors', () => {
  it('Given unseated user, When declareRevolution called, Then throws ForbiddenError (403)', async () => {
    const { gameRepository } = await setupTributeFixture();
    await assert.rejects(
      () =>
        declareRevolution(
          { gameRepository },
          { code: 'ROOM1', user: { id: 'u-stranger' }, version: 1 },
        ),
      { name: 'ForbiddenError', code: 'FORBIDDEN' },
    );
  });
});

describe('Revolution card requirement errors', () => {
  it('Given player without 2 jesters, When declareRevolution called, Then throws DomainError (422)', async () => {
    const j1 = createCard(13, 1);
    const handsOverride = {
      0: [j1, createCard(1, 1)],
      1: [createCard(5, 1)],
      2: [createCard(6, 1)],
      3: [createCard(12, 1)],
    };
    const { gameRepository } = await setupTributeFixture({ handsOverride });

    await assert.rejects(
      () =>
        declareRevolution(
          { gameRepository },
          { code: 'ROOM1', user: { id: 'u-gd' }, version: 1 },
        ),
      { name: 'DomainError', code: 'NOT_ENOUGH_JESTERS' },
    );
  });
});
