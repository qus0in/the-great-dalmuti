import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { call } from './test-app.js';
import { startRuntimeApp } from './runtime-test-app.js';

async function setupRoom(app) {
  await call(app.baseUrl, '/api/rooms', { method: 'POST', userId: 'u0' });
  for (const id of ['u1', 'u2', 'u3']) {
    await call(app.baseUrl, '/api/rooms/ROOM01/join', {
      method: 'POST',
      userId: id,
    });
  }
  return call(app.baseUrl, '/api/rooms/ROOM01/start', {
    method: 'POST',
    userId: 'u0',
  });
}

describe('GET /api/rooms/:code lastSubstitution contract', () => {
  it('Given runtime substitution, When GET room, Then exposes lastSubstitution', async () => {
    let sub = null;
    const runtime = {
      afterAction: (_code, res) => Promise.resolve(res),
      getLastSubstitution: () => sub,
    };
    const app = await startRuntimeApp({ runtime });
    try {
      await setupRoom(app);
      const res1 = await call(app.baseUrl, '/api/rooms/ROOM01', {
        userId: 'u0',
      });
      assert.equal(res1.body.lastSubstitution, null);

      sub = { seat: 0, action: 'play' };
      const res2 = await call(app.baseUrl, '/api/rooms/ROOM01', {
        userId: 'u0',
      });
      assert.deepEqual(res2.body.lastSubstitution, { seat: 0, action: 'play' });
    } finally {
      await app.close();
    }
  });
});
