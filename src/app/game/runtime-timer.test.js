import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import {
  botSeat,
  createFakeScheduler,
  humanSeat,
  seedRoom,
} from './runtime-fixture.js';
import { createSubstitutions } from './timer-substitutions.js';
import { createGameRuntime } from './runtime-controller.js';
import { playCardsAsSeat } from './play-actions.js';

async function advanceToNextTurn(repository, runtime) {
  const aggBefore = await repository.findGameByCode('ROOM1');
  const hands = await repository.findHands(aggBefore.game.id);
  await playCardsAsSeat(
    { gameRepository: repository },
    {
      code: 'ROOM1',
      seat: 0,
      cards: [hands[0][0].id],
      version: aggBefore.game.version,
    },
  );
  await runtime.afterAction('ROOM1', {});
  return repository.findGameByCode('ROOM1');
}

function captureScheduler() {
  const base = createFakeScheduler();
  const captured = [];
  return {
    ...base,
    setTimer(fn, ms) {
      const id = base.setTimer(fn, ms);
      captured.push({ id, fn });
      return id;
    },
    capturedFn: (id) => captured.find((c) => c.id === id)?.fn,
  };
}

async function setupFixture() {
  const repository = createInMemoryGameRepository();
  const scheduler = captureScheduler();
  const substitutions = createSubstitutions();
  const seats = [humanSeat(0), botSeat(1), botSeat(2), botSeat(3)];
  await seedRoom(repository, { turnSeat: 0, seats });
  const runtime = createGameRuntime({
    gameRepository: repository,
    scheduler,
    substitutions,
  });
  return { repository, scheduler, substitutions, runtime };
}

describe('Stale timer callback rejection (ADR-0015)', () => {
  it('Given stale callback with older version, When fires, Then ignored and new timer preserved', async () => {
    const { repository, scheduler, substitutions, runtime } =
      await setupFixture();

    await runtime.afterAction('ROOM1', {});
    const [oldHandle] = scheduler.pending();
    const oldCallback = scheduler.capturedFn(oldHandle);

    const aggAfter = await advanceToNextTurn(repository, runtime);
    assert.equal(aggAfter.publicState.currentTurnSeat, 0);
    const [newHandle] = scheduler.pending();
    assert.notEqual(newHandle, oldHandle);

    oldCallback();
    await runtime.afterAction('ROOM1', {});
    assert.equal(substitutions.isSubstituted('ROOM1', 0), false);
    assert.deepEqual(substitutions.seatsIn('ROOM1'), []);
    assert.equal(runtime.getLastSubstitution('ROOM1'), null);
    assert.deepEqual(scheduler.pending(), [newHandle]);

    scheduler.fire(newHandle);
    await runtime.afterAction('ROOM1', {});
    assert.deepEqual(substitutions.seatsIn('ROOM1'), [0]);
    runtime.dispose();
  });
});
