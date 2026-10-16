import { it } from 'node:test';
import assert from 'node:assert/strict';
import { call } from './game/test-app.js';
import {
  CODE,
  driveRound,
  startRuntimeFlowApp,
} from './game-runtime-flow.helper.js';

it('Given single human + bots, When round ends, Then single stats stored', async () => {
  const app = await startRuntimeFlowApp();
  try {
    await call(app.baseUrl, '/api/rooms', { method: 'POST', userId: 'u0' });
    const started = await call(app.baseUrl, `/api/rooms/${CODE}/start`, {
      method: 'POST',
      userId: 'u0',
    });
    assert.equal(started.status, 200);
    assert.deepEqual(app.scheduler.delays(), [30000]);

    const round = await driveRound(app);
    assert.ok(
      !round.error,
      `flow blocked: ${round.error} ${JSON.stringify(round.log)}`,
    );
    assert.equal(round.roundEnded, true);
    assert.ok(!round.log.turns.includes(1), 'bot turn leaked to HTTP');

    const stats = await call(app.baseUrl, '/api/stats', { userId: 'u0' });
    assert.equal(stats.status, 200);
    assert.equal(stats.body.stats[0].mode, 'single');
    assert.equal(stats.body.stats[0].total_games, 1);
    assert.equal(app.scheduler.pending().length, 0);
    app.runtime.dispose();
  } finally {
    await app.close();
  }
});
