import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createGameRuntime } from './runtime-controller.js';
import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createSubstitutions } from './timer-substitutions.js';
import { createFakeScheduler, humanSeat, seedRoom } from './runtime-fixture.js';

it('Given finished room, When afterAction twice, Then stats once without delegate', async () => {
  const repository = createInMemoryGameRepository();
  const scheduler = createFakeScheduler();
  const substitutions = createSubstitutions();
  substitutions.mark('ROOM1', 3);
  await seedRoom(repository, {
    phase: 'finished',
    finishPositions: [1, 2, 3, 4],
    seats: [
      humanSeat(0, 'u0'),
      humanSeat(1, 'u1'),
      humanSeat(2, 'u2'),
      humanSeat(3, 'u3'),
    ],
  });
  const runtime = createGameRuntime({
    gameRepository: repository,
    scheduler,
    substitutions,
  });

  const result = await runtime.afterAction('ROOM1', {});
  await runtime.afterAction('ROOM1', {});

  assert.equal(result.rankings.length, 4);
  assert.equal((await repository.findStatsByUser('u0'))[0].total_games, 1);
  assert.equal((await repository.findStatsByUser('u2'))[0].total_games, 1);
  assert.deepEqual(await repository.findStatsByUser('u3'), []);
  runtime.dispose();
});

it('Given missing room, When afterAction, Then timer cancelled and result returned', async () => {
  const repository = createInMemoryGameRepository();
  const scheduler = createFakeScheduler();
  await seedRoom(repository, { turnSeat: 0 });
  const runtime = createGameRuntime({ gameRepository: repository, scheduler });
  await runtime.afterAction('ROOM1', {});
  repository.findGameByCode = () => Promise.resolve(null);

  const result = await runtime.afterAction('ROOM1', { kept: true });

  assert.equal(result.kept, true);
  assert.deepEqual(scheduler.pending(), []);
  runtime.dispose();
});

it('Given bot turn without hands, When afterAction, Then onError boundary', async () => {
  const repository = createInMemoryGameRepository();
  const scheduler = createFakeScheduler();
  const errors = [];
  await seedRoom(repository, { turnSeat: 1 });
  repository.findHands = () => Promise.resolve(null);
  const runtime = createGameRuntime({
    gameRepository: repository,
    scheduler,
    onError: (err, ctx) => errors.push({ err, ctx }),
  });

  const result = await runtime.afterAction('ROOM1', { kept: true });

  assert.equal(result.kept, true);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].ctx.code, 'ROOM1');
  runtime.dispose();
});

it('Given dispose, When called, Then all room timers cancelled', async () => {
  const repository = createInMemoryGameRepository();
  const scheduler = createFakeScheduler();
  await seedRoom(repository, { code: 'ROOM1', gameId: 'g1' });
  await seedRoom(repository, {
    code: 'ROOM2',
    gameId: 'g2',
    seats: [
      humanSeat(0, 'a0'),
      humanSeat(1, 'a1'),
      humanSeat(2, 'a2'),
      humanSeat(3, 'a3'),
    ],
  });
  const runtime = createGameRuntime({ gameRepository: repository, scheduler });
  await runtime.afterAction('ROOM1', {});
  await runtime.afterAction('ROOM2', {});
  assert.equal(scheduler.pending().length, 2);

  runtime.dispose();

  assert.deepEqual(scheduler.pending(), []);
});
