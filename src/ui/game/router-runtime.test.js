import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { call } from './test-app.js';
import { fakeRuntime, startRuntimeApp } from './runtime-test-app.js';

async function startAndJoin(app) {
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

async function playFirstCard(app) {
  const agg = await app.repository.findGameByCode('ROOM01');
  const hands = await app.repository.findHands(agg.game.id);
  return call(app.baseUrl, '/api/rooms/ROOM01/plays', {
    method: 'POST',
    userId: 'u0',
    body: { version: agg.game.version, cards: [hands[0][0].id] },
  });
}

describe('Runtime afterAction on start', () => {
  it('Given start, When started, Then runtime runs and response is latest', async () => {
    const runtime = fakeRuntime();
    const app = await startRuntimeApp({ runtime });
    try {
      const res = await startAndJoin(app);
      assert.equal(res.status, 200);
      assert.deepEqual(runtime.calls, ['ROOM01']);
      assert.equal(res.body.publicState.progressed, true);
    } finally {
      await app.close();
    }
  });
});

describe('Runtime afterAction on play', () => {
  it('Given play, When played, Then runtime runs and response is latest', async () => {
    const runtime = fakeRuntime();
    const app = await startRuntimeApp({ runtime });
    try {
      await startAndJoin(app);
      const res = await playFirstCard(app);
      assert.equal(res.status, 200);
      assert.deepEqual(runtime.calls, ['ROOM01', 'ROOM01']);
      assert.equal(res.body.publicState.progressed, true);
    } finally {
      await app.close();
    }
  });
});

describe('Runtime afterAction on pass', () => {
  it('Given pass, When passed, Then runtime runs', async () => {
    const runtime = fakeRuntime();
    const app = await startRuntimeApp({ runtime });
    try {
      await startAndJoin(app);
      await playFirstCard(app);
      const agg = await app.repository.findGameByCode('ROOM01');
      const res = await call(app.baseUrl, '/api/rooms/ROOM01/pass', {
        method: 'POST',
        userId: 'u1',
        body: { version: agg.game.version },
      });
      assert.equal(res.status, 200);
      assert.deepEqual(runtime.calls, ['ROOM01', 'ROOM01', 'ROOM01']);
      assert.equal(res.body.publicState.progressed, true);
    } finally {
      await app.close();
    }
  });
});

describe('Runtime not on read', () => {
  it('Given GET room, When read, Then runtime never runs', async () => {
    const runtime = fakeRuntime();
    const app = await startRuntimeApp({ runtime });
    try {
      await startAndJoin(app);
      const before = runtime.calls.length;
      const res = await call(app.baseUrl, '/api/rooms/ROOM01', {
        userId: 'u0',
      });
      assert.equal(res.status, 200);
      assert.equal(runtime.calls.length, before);
    } finally {
      await app.close();
    }
  });
});
