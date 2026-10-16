import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';
import { joinRoom } from './room-join.js';
import { NotFoundError, ConflictError } from './room-errors.js';

describe('Room join missing room', () => {
  it('Given missing room code, When joinRoom called, Then throws NotFoundError', async () => {
    const gameRepository = createInMemoryGameRepository();
    await assert.rejects(
      async () => {
        await joinRoom(
          { gameRepository },
          { joinCode: 'NOPE99', user: { id: 'u2' } },
        );
      },
      (err) => err instanceof NotFoundError && err.code === 'ROOM_NOT_FOUND',
    );
  });
});

describe('Room join full room', () => {
  it('Given 4 seated users, When 5th user joins, Then throws ConflictError with ROOM_FULL', async () => {
    const gameRepository = createInMemoryGameRepository();
    const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
    const { game } = await createRoom(
      { gameRepository, clock },
      { hostUser: { id: 'u1' } },
    );

    for (const id of ['u2', 'u3', 'u4']) {
      await joinRoom(
        { gameRepository, clock },
        { joinCode: game.joinCode, user: { id } },
      );
    }

    await assert.rejects(
      async () => {
        await joinRoom(
          { gameRepository, clock },
          { joinCode: game.joinCode, user: { id: 'u5' } },
        );
      },
      (err) => err instanceof ConflictError && err.code === 'ROOM_FULL',
    );
  });
});

describe('Room join empty seat assignment', () => {
  it('Given valid room, When joinRoom called, Then assigns next empty seat', async () => {
    const gameRepository = createInMemoryGameRepository();
    const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
    const hostUser = { id: 'host-1', name: '방장' };
    const { game } = await createRoom({ gameRepository, clock }, { hostUser });

    const guestUser = { id: 'guest-2', name: '게스트' };
    const result = await joinRoom(
      { gameRepository, clock },
      { joinCode: game.joinCode, user: guestUser },
    );

    assert.equal(result.seat, 1);
    assert.equal(result.seats[1].userId, 'guest-2');
    assert.equal(result.publicState.seatSummary.length, 2);
  });
});

describe('Room join idempotency', () => {
  it('Given already seated user, When joinRoom called, Then returns existing seat without consuming new seat', async () => {
    const gameRepository = createInMemoryGameRepository();
    const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
    const hostUser = { id: 'host-1', name: '방장' };
    const { game } = await createRoom({ gameRepository, clock }, { hostUser });

    const result = await joinRoom(
      { gameRepository, clock },
      { joinCode: game.joinCode, user: hostUser },
    );
    assert.equal(result.seat, 0);
  });
});
