import { it } from 'node:test';
import assert from 'node:assert/strict';
import { call, startTestApp } from './test-app.js';

it('Given tutorial body, When created, joined and started, Then mode is public and guests forbidden', async () => {
  const app = await startTestApp();
  const post = (path, userId, body) =>
    call(app.baseUrl, path, { method: 'POST', userId, body });
  try {
    const created = await post('/api/rooms', 'host', { mode: 'tutorial' });
    assert.equal(created.status, 201);
    assert.equal(created.body.game.mode, 'tutorial');
    assert.equal(created.body.publicState.mode, 'tutorial');
    const guest = await post('/api/rooms/ROOM01/join', 'guest');
    assert.equal(guest.status, 403);
    assert.equal(guest.body.code, 'TUTORIAL_ONLY_HOST');
    const started = await post('/api/rooms/ROOM01/start', 'host');
    assert.equal(started.status, 200);
    assert.equal(started.body.publicState.mode, 'tutorial');
    assert.equal(
      started.body.publicState.seatSummary.filter((s) => s.isBot).length,
      3,
    );
    const fetched = await call(app.baseUrl, '/api/rooms/ROOM01', {
      userId: 'host',
    });
    assert.equal(fetched.body.publicState.mode, 'tutorial');
  } finally {
    await app.close();
  }
});

it('Given unsupported mode, When creating, Then rejects with 400', async () => {
  const app = await startTestApp();
  try {
    for (const mode of ['invalid', null, 1]) {
      const result = await call(app.baseUrl, '/api/rooms', {
        method: 'POST',
        userId: 'host',
        body: { mode },
      });
      assert.equal(result.status, 400);
    }
  } finally {
    await app.close();
  }
});
