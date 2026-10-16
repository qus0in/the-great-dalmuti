import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';

describe('Room create use case', () => {
  it('Given host user, When createRoom called, Then creates game with host at seat 0', async () => {
    const gameRepository = createInMemoryGameRepository();
    const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
    const rng = { generateJoinCode: () => 'ROOM01' };

    const hostUser = { id: 'host-1', name: '달무티' };
    const result = await createRoom(
      { gameRepository, clock, rng },
      { hostUser },
    );

    assert.equal(result.game.joinCode, 'ROOM01');
    assert.equal(result.game.phase, 'waiting');
    assert.equal(result.game.version, 1);
    assert.equal(result.game.hostSeat, 0);

    assert.equal(result.seats.length, 4);
    assert.equal(result.seats[0].userId, 'host-1');
    assert.equal(result.seats[0].userName, '달무티');
    assert.equal(result.seats[0].isBot, false);

    assert.equal(result.seats[1].userId, null);
    assert.equal(result.seats[2].userId, null);
    assert.equal(result.seats[3].userId, null);

    assert.equal(result.publicState.phase, 'waiting');
    assert.equal(result.publicState.seatSummary.length, 1);
    assert.equal(result.publicState.seatSummary[0].seat, 0);
  });
});
