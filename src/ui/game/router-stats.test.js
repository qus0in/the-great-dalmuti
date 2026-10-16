import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { call } from './test-app.js';
import { startRuntimeApp } from './runtime-test-app.js';

async function seedResults(repository) {
  await repository.saveResults('g1', [
    { gameId: 'g1', userId: 'u0', mode: 'multi', rank: 1, playedAt: 't' },
    { gameId: 'g1', userId: 'u1', mode: 'multi', rank: 2, playedAt: 't' },
  ]);
}

describe('Stats privacy', () => {
  it('Given two users results, When get stats, Then only mine', async () => {
    const app = await startRuntimeApp({});
    try {
      await seedResults(app.repository);
      const res = await call(app.baseUrl, '/api/stats', { userId: 'u0' });
      assert.equal(res.status, 200);
      assert.deepEqual(
        res.body.stats.map((s) => s.user_id),
        ['u0'],
      );
      assert.equal(JSON.stringify(res.body).includes('"u1"'), false);
    } finally {
      await app.close();
    }
  });

  it('Given no credentials, When get stats, Then 401', async () => {
    const app = await startRuntimeApp({});
    try {
      const res = await call(app.baseUrl, '/api/stats');
      assert.equal(res.status, 401);
      assert.match(res.contentType, /problem\+json/);
    } finally {
      await app.close();
    }
  });
});
