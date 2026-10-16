import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createFakeScheduler } from './runtime-fixture.js';
import { createSubstitutions } from './timer-substitutions.js';
import { createGameRuntime } from './runtime-controller.js';
import { createRoom } from './room-create.js';
import { startGame } from './room-start.js';

const CODE = 'SOLO01';
const CLOCK = { now: () => new Date('2026-10-16T12:00:00Z') };

async function waitForEnd(repository, errors) {
  let agg;
  for (let i = 0; i < 2000; i += 1) {
    agg = await repository.findGameByCode(CODE);
    if (agg.game.phase === 'finished' || errors.length > 0) return agg;
    await new Promise(setImmediate);
  }
  return agg;
}

async function makeSingleRoom() {
  const repository = createInMemoryGameRepository();
  const scheduler = createFakeScheduler();
  const substitutions = createSubstitutions();
  const errors = [];
  const savedResults = [];
  const { saveResults } = repository;
  repository.saveResults = (...args) => {
    savedResults.push(args);
    return saveResults(...args);
  };
  const rng = { random: () => 0.5, generateJoinCode: () => CODE };
  const { game } = await createRoom(
    { gameRepository: repository, clock: CLOCK, rng },
    { hostUser: { id: 'u0', name: 'host' } },
  );
  const runtime = createGameRuntime({
    gameRepository: repository,
    clock: CLOCK,
    scheduler,
    substitutions,
    onError: (error) => errors.push(error.message),
  });
  const started = await startGame(
    { gameRepository: repository, clock: CLOCK, rng },
    { joinCode: game.joinCode, user: { id: 'u0' } },
  );
  return { repository, scheduler, errors, savedResults, runtime, started };
}

it('single user timeout delegates the full game without HTTP actions', async () => {
  const { repository, scheduler, errors, savedResults, runtime, started } =
    await makeSingleRoom();
  try {
    await runtime.afterAction(CODE, started);
    assert.deepEqual(scheduler.delays(), [30000]);
    scheduler.fire(scheduler.pending()[0]);
    const finished = await waitForEnd(repository, errors);
    assert.equal(finished.game.phase, 'finished');
    assert.deepEqual(errors, []);
    assert.equal(savedResults.length, 1);
    assert.deepEqual(savedResults[0][1], []);
    assert.deepEqual(await repository.findStatsByUser('u0'), []);
    assert.deepEqual(scheduler.pending(), []);
  } finally {
    runtime.dispose();
  }
});
