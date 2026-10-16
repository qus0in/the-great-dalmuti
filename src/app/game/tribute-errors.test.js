import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCard } from '../../domain/game/cards.js';
import { submitTribute } from './tribute-actions.js';
import { setupTributeFixture } from './tribute-test-fixture.js';

function callSubmit(repo, cards, { user = 'u-gd', version = 1, returns } = {}) {
  const defaultReturns = {
    대달무티: [cards.gd[0], cards.gd[1]],
    소달무티: [cards.ld[0]],
  };
  return submitTribute(
    { gameRepository: repo },
    {
      code: 'ROOM1',
      user: { id: user },
      returns: returns ?? defaultReturns,
      version,
    },
  );
}

describe('Tribute phase and version validation errors', () => {
  it('Given game in playing phase, When submitTribute called, Then throws ConflictError (409)', async () => {
    const { gameRepository, cards } = await setupTributeFixture({
      phase: 'playing',
    });
    await assert.rejects(() => callSubmit(gameRepository, cards), {
      name: 'ConflictError',
      code: 'CONFLICT',
    });
  });

  it('Given stale version, When submitTribute called, Then throws ConflictError (409)', async () => {
    const { gameRepository, cards } = await setupTributeFixture({ version: 2 });
    await assert.rejects(
      () => callSubmit(gameRepository, cards, { version: 1 }),
      { name: 'ConflictError', code: 'STALE_VERSION' },
    );
  });
});

describe('Tribute seat authority errors', () => {
  it('Given unseated user or unauthorized peon, When submitTribute called, Then throws ForbiddenError (403)', async () => {
    const { gameRepository, cards } = await setupTributeFixture();
    await assert.rejects(
      () => callSubmit(gameRepository, cards, { user: 'u-intruder' }),
      { name: 'ForbiddenError', code: 'FORBIDDEN' },
    );
    await assert.rejects(
      () => callSubmit(gameRepository, cards, { user: 'u-gp' }),
      { name: 'ForbiddenError', code: 'FORBIDDEN' },
    );
  });
});

describe('Tribute domain rule violation errors', () => {
  it('Given invalid return card count, When submitTribute called, Then throws DomainError (422)', async () => {
    const { gameRepository, cards } = await setupTributeFixture();
    await assert.rejects(
      () =>
        callSubmit(gameRepository, cards, {
          returns: { 대달무티: [cards.gd[0]], 소달무티: [cards.ld[0]] },
        }),
      { name: 'DomainError', code: 'INVALID_CARD_COUNT' },
    );
    await assert.rejects(
      () =>
        callSubmit(gameRepository, cards, {
          returns: {
            대달무티: [createCard(1, 99), createCard(2, 99)],
            소달무티: [cards.ld[0]],
          },
        }),
      { name: 'DomainError', code: 'CARD_NOT_IN_HAND' },
    );
  });
});
