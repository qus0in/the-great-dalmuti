import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createApp } from './server.js';

function fakeGameRouter() {
  const router = express.Router();
  router.get('/api/rooms/probe', (_req, res) => res.json({ ok: true }));
  router.get('/api/rooms/boom', () => {
    throw new Error('boom');
  });
  return router;
}

async function withApp(app, fn) {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections?.();
    });
  }
}

describe('createApp game router mount', () => {
  it('Given gameRouter, When /api/rooms called, Then router handles it', async () => {
    const app = createApp({ gameRouter: fakeGameRouter() });
    await withApp(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/rooms/probe`);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { ok: true });
    });
  });

  it('Given router error, When requested, Then Problem Details 500', async () => {
    const app = createApp({ gameRouter: fakeGameRouter() });
    await withApp(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/rooms/boom`);
      assert.equal(res.status, 500);
      assert.match(res.headers.get('content-type') ?? '', /problem\+json/);
    });
  });

  it('Given no gameRouter, When /api/rooms called, Then 404 problem', async () => {
    const app = createApp();
    await withApp(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/rooms/probe`);
      assert.equal(res.status, 404);
      assert.match(res.headers.get('content-type') ?? '', /problem\+json/);
      assert.equal((await res.json()).status, 404);
    });
  });
});
