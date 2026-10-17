import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createGameRuntime } from './runtime-controller.js';
import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createSubstitutions } from './timer-substitutions.js';
import { createFakeScheduler, humanSeat, seedRoom } from './runtime-fixture.js';
it('Given bot turn, When afterAction, Then stops at human with 30s timer', async () => {
  const repository = createInMemoryGameRepository();
  const scheduler = createFakeScheduler();
  await seedRoom(repository, { turnSeat: 1 });
  const runtime = createGameRuntime({ gameRepository: repository, scheduler });
  const result = await runtime.afterAction('ROOM1', {});
  assert.equal(result.publicState.currentTurnSeat, 3);
  assert.deepEqual(scheduler.delays(), [30000]);
  runtime.dispose();
});
it('Given same human turn, When afterAction twice, Then timer not extended', async () => {
  const repository = createInMemoryGameRepository();
  const scheduler = createFakeScheduler();
  await seedRoom(repository, { turnSeat: 0 });
  const runtime = createGameRuntime({ gameRepository: repository, scheduler });
  await runtime.afterAction('ROOM1', {});
  await runtime.afterAction('ROOM1', {});
  assert.equal(scheduler.setCount(), 1);
  runtime.dispose();
});
it('Given timer expiry, When fired, Then seat substituted and bots advance', async () => {
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
  const [handle] = scheduler.pending();
  scheduler.fire(handle);
  const result = await runtime.afterAction('ROOM1', {});
  assert.equal(substitutions.isSubstituted('ROOM1', 0), false);
  assert.deepEqual(substitutions.seatsIn('ROOM1'), [0]);
  assert.equal(result.publicState.currentTurnSeat, 3);
  assert.equal(scheduler.pending().length, 1);
  runtime.dispose();
});
it('Given two rooms, When one expires, Then other timer remains', async () => {
  const repository = createInMemoryGameRepository();
  const scheduler = createFakeScheduler();
  await seedRoom(repository, { code: 'ROOM1', gameId: 'g1', turnSeat: 0 });
  await seedRoom(repository, { code: 'ROOM2', gameId: 'g2', turnSeat: 0 });
  const runtime = createGameRuntime({ gameRepository: repository, scheduler });
  await runtime.afterAction('ROOM1', {});
  await runtime.afterAction('ROOM2', {});
  const [first, second] = scheduler.pending();
  scheduler.fire(first);
  await runtime.afterAction('ROOM1', {});
  assert.ok(scheduler.pending().includes(second));
  assert.equal(scheduler.pending().length, 2);
  runtime.cancelRoom('ROOM2');
  assert.equal(scheduler.pending().length, 1);
  runtime.dispose();
});
async function seedFinished(repository) {
  await seedRoom(repository, {
    phase: 'finished',
    finishPositions: [1, 2, 3, 4],
    seats: [humanSeat(0), humanSeat(1), humanSeat(2), humanSeat(3)],
  });
}
it('Given finished room, When two afterAction race, Then stats saved once', async () => {
  const repository = createInMemoryGameRepository();
  await seedFinished(repository);
  const saves = [];
  const { saveResults } = repository;
  repository.saveResults = (gameId, rows) => {
    saves.push(rows.length);
    return saveResults(gameId, rows);
  };
  const runtime = createGameRuntime({
    gameRepository: repository,
    scheduler: createFakeScheduler(),
    substitutions: createSubstitutions(),
  });
  const [first] = await Promise.all([
    runtime.afterAction('ROOM1', {}),
    runtime.afterAction('ROOM1', {}),
  ]);
  assert.equal(saves.length, 1);
  assert.equal(first.rankings.length, 4);
  assert.equal((await repository.findStatsByUser('u0'))[0].total_games, 1);
  runtime.dispose();
});
