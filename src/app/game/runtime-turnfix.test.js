import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createFakeScheduler, seedRoom } from './runtime-fixture.js';
import { createSubstitutions } from './timer-substitutions.js';
import { createGameRuntime } from './runtime-controller.js';

describe('Tutorial mode timer prevention (ADR-0015)', () => {
  it('Given tutorial mode, When afterAction reaches human seat, Then timer is not armed', async () => {
    const repository = createInMemoryGameRepository();
    const scheduler = createFakeScheduler();
    await seedRoom(repository, { turnSeat: 0 });
    const agg = await repository.findGameByCode('ROOM1');
    agg.game.mode = 'tutorial';
    agg.publicState.mode = 'tutorial';
    await repository.saveGameAndPublic({
      game: agg.game,
      publicState: agg.publicState,
      expectedVersion: agg.game.version,
    });

    const runtime = createGameRuntime({
      gameRepository: repository,
      scheduler,
    });
    const result = await runtime.afterAction('ROOM1', {});

    assert.equal(result.publicState.currentTurnSeat, 0);
    assert.deepEqual(scheduler.pending(), []);
    assert.deepEqual(scheduler.delays(), []);
    runtime.dispose();
  });
});

describe('1-turn substitution and timer re-arm (ADR-0015)', () => {
  it('Given timeout on human seat, When 1-turn substitution runs, Then timer re-arms on next turn', async () => {
    const repository = createInMemoryGameRepository();
    const scheduler = createFakeScheduler();
    const substitutions = createSubstitutions();
    await seedRoom(repository, { turnSeat: 0 });
    const runtime = createGameRuntime({
      gameRepository: repository,
      scheduler,
      substitutions,
    });

    await runtime.afterAction('ROOM1', {});
    assert.deepEqual(scheduler.delays(), [30000]);

    const [handle] = scheduler.pending();
    scheduler.fire(handle);
    await runtime.afterAction('ROOM1', {});

    assert.equal(substitutions.isSubstituted('ROOM1', 0), false);
    assert.deepEqual(substitutions.seatsIn('ROOM1'), [0]);
    assert.deepEqual(runtime.getLastSubstitution('ROOM1'), {
      seat: 0,
      action: 'play',
      version: 1,
    });

    await runtime.afterAction('ROOM1', {});
    assert.equal(runtime.getLastSubstitution('ROOM1'), null);
    runtime.dispose();
  });
});
