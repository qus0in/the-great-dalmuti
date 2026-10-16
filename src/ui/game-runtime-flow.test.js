import { it } from 'node:test';
import assert from 'node:assert/strict';
import { call } from './game/test-app.js';
import {
  CODE,
  driveRound,
  startRuntimeFlowApp,
} from './game-runtime-flow.helper.js';

async function prepareMulti(app) {
  await call(app.baseUrl, '/api/rooms', { method: 'POST', userId: 'u0' });
  for (const id of ['u1', 'u2']) {
    await call(app.baseUrl, `/api/rooms/${CODE}/join`, {
      method: 'POST',
      userId: id,
    });
  }
  return call(app.baseUrl, `/api/rooms/${CODE}/start`, {
    method: 'POST',
    userId: 'u0',
  });
}

// 사람 차례 30초 예약 → GET은 연장하지 않음 → 만료 대행 → 자동 진행
async function expireFirstHuman(app) {
  assert.deepEqual(app.scheduler.delays(), [30000]);
  const before = app.scheduler.setCount();
  await call(app.baseUrl, `/api/rooms/${CODE}`, { userId: 'u0' });
  assert.equal(app.scheduler.setCount(), before);

  const [expired] = app.scheduler.pending();
  app.scheduler.fire(expired);
  await app.runtime.afterAction(CODE, {});
  assert.equal(app.substitutions.isSubstituted(CODE, 0), true);
  assert.equal(app.scheduler.pending().length, 1);
}

async function assertFinished(app) {
  const room = await call(app.baseUrl, `/api/rooms/${CODE}`, { userId: 'u1' });
  assert.equal(room.body.publicState.phase, 'finished');
  assert.deepEqual(app.scheduler.pending(), []);
  const agg = await app.repository.findGameByCode(CODE);
  const positions = agg.seats
    .map((s) => s.finishPosition)
    .sort((a, b) => a - b);
  assert.deepEqual(positions, [1, 2, 3, 4]);
}

async function assertStats(app) {
  const mine = await call(app.baseUrl, '/api/stats', { userId: 'u1' });
  assert.equal(mine.status, 200);
  assert.ok(mine.body.stats.every((s) => s.user_id === 'u1'));
  assert.equal(mine.body.stats[0].mode, 'multi');
  assert.equal(JSON.stringify(mine.body).includes('"u2"'), false);

  const other = await call(app.baseUrl, '/api/stats', { userId: 'u2' });
  assert.equal(other.body.stats[0].total_games, 1);
  const delegated = await call(app.baseUrl, '/api/stats', { userId: 'u0' });
  assert.deepEqual(delegated.body.stats, []);

  const anon = await call(app.baseUrl, '/api/stats');
  assert.equal(anon.status, 401);
  assert.match(anon.contentType, /problem\+json/);
}

it('Given bots+humans, When timer expires and round ends, Then stats wired', async () => {
  const app = await startRuntimeFlowApp();
  try {
    const started = await prepareMulti(app);
    assert.equal(started.status, 200);
    await expireFirstHuman(app);

    const round = await driveRound(app);
    assert.ok(!round.error, `${round.error} ${JSON.stringify(round.log)}`);
    assert.equal(round.roundEnded, true);
    assert.ok(round.log.tricks > 0);
    assert.ok(!round.log.turns.includes(3), 'bot turn leaked to HTTP');
    assert.equal(round.log.leaks, 0, 'hands/card ids leaked');

    await assertFinished(app);
    await assertStats(app);
    assert.equal(app.errors.length, 0);
    app.runtime.dispose();
    assert.deepEqual(app.scheduler.pending(), []);
  } finally {
    await app.close();
  }
});
