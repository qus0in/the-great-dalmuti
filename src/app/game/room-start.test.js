import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';
import { joinRoom } from './room-join.js';
import { startGame } from './room-start.js';
import { ForbiddenError, ConflictError } from './room-errors.js';

describe('Room start permission', () => {
  it('Given non-host user, When startGame called, Then throws ForbiddenError', async () => {
    const gameRepository = createInMemoryGameRepository();
    const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
    const { game } = await createRoom(
      { gameRepository, clock },
      { hostUser: { id: 'host-1' } },
    );
    await joinRoom(
      { gameRepository, clock },
      { joinCode: game.joinCode, user: { id: 'guest-2' } },
    );

    await assert.rejects(
      async () => {
        await startGame(
          { gameRepository, clock },
          { joinCode: game.joinCode, user: { id: 'guest-2' } },
        );
      },
      (err) => err instanceof ForbiddenError,
    );
  });
});

describe('Room start phase conflict', () => {
  it('Given game already started, When host calls startGame again, Then throws ConflictError', async () => {
    const gameRepository = createInMemoryGameRepository();
    const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
    const { game } = await createRoom(
      { gameRepository, clock },
      { hostUser: { id: 'host-1' } },
    );

    await startGame(
      { gameRepository, clock },
      { joinCode: game.joinCode, user: { id: 'host-1' } },
    );

    await assert.rejects(
      async () => {
        await startGame(
          { gameRepository, clock },
          { joinCode: game.joinCode, user: { id: 'host-1' } },
        );
      },
      (err) => err instanceof ConflictError,
    );
  });
});

describe('Room start execution and card distribution', () => {
  it('Given waiting room with 2 humans, When host starts, Then fills bots, deals cards and sets phase to playing', async () => {
    const gameRepository = createInMemoryGameRepository();
    const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
    const { game } = await createRoom(
      { gameRepository, clock },
      { hostUser: { id: 'host-1', name: '방장' } },
    );
    await joinRoom(
      { gameRepository, clock },
      { joinCode: game.joinCode, user: { id: 'guest-2', name: '게스트' } },
    );

    const result = await startGame(
      { gameRepository, clock, rng: { random: () => 0.5 } },
      { joinCode: game.joinCode, user: { id: 'host-1' } },
    );

    assert.equal(result.game.phase, 'playing');
    assert.equal(result.game.version, 2);
    assert.equal(result.seats[0].isBot, false);
    assert.equal(result.seats[2].isBot, true);

    assert.equal(result.hands[0].length, 20);
    assert.equal(result.hands[1].length, 20);
    assert.equal(result.publicState.phase, 'playing');
    assert.equal(result.publicState.seatSummary[0].cardCount, 20);

    const savedHands = await gameRepository.findHands(result.game.id);
    assert.ok(savedHands);
    assert.equal(savedHands[0].length, 20);
  });
});
