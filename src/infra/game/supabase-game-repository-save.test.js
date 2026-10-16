import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createSupabaseGameRepository } from './supabase-game-repository.js';
import { createMockClient } from './mock-client.test-helper.js';
import { ConflictError } from '../../app/game/room-errors.js';

describe('Supabase repository optimistic locking success', () => {
  it('Given matching version, When saveGameAndPublic, Then succeeds', async () => {
    const client = createMockClient({
      updateReturn: [{ id: 'g1', version: 2 }],
    });
    const repo = createSupabaseGameRepository({ client });
    const game = {
      id: 'g1',
      joinCode: 'C1',
      phase: 'playing',
      version: 2,
      hostSeat: 0,
    };
    const publicState = { gameId: 'g1', phase: 'playing', version: 2 };

    await assert.doesNotReject(async () => {
      await repo.saveGameAndPublic({ game, publicState, expectedVersion: 1 });
    });
  });
});

describe('Supabase repository optimistic locking conflict', () => {
  it('Given stale version, When saveGameAndPublic, Then throws ConflictError', async () => {
    const client = createMockClient({ updateReturn: [] });
    const repo = createSupabaseGameRepository({ client });
    const game = {
      id: 'g1',
      joinCode: 'C1',
      phase: 'playing',
      version: 2,
      hostSeat: 0,
    };
    const publicState = { gameId: 'g1', phase: 'playing', version: 2 };

    await assert.rejects(
      async () => {
        await repo.saveGameAndPublic({ game, publicState, expectedVersion: 1 });
      },
      (err) => err instanceof ConflictError && err.code === 'STALE_VERSION',
    );
  });
});

describe('Supabase repository saveHands and findHands', () => {
  it('Given hands, When saved and fetched, Then succeeds', async () => {
    const client = createMockClient({
      tables: {
        game_hands: [{ game_id: 'g1', seat: 0, cards: [{ id: '1-1' }] }],
      },
    });
    const repo = createSupabaseGameRepository({ client });
    await repo.saveHands('g1', { 0: [{ id: '1-1' }] });
    const hands = await repo.findHands('g1');

    assert.ok(hands);
    assert.deepEqual(hands[0], [{ id: '1-1' }]);
  });
});
