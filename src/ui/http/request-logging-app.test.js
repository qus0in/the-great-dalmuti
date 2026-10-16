import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequestLogging } from './request-logging.js';
import { createApp } from '../server.js';
import { capture, withLoggedApp } from './request-logging.test.js';

describe('Request logging options', () => {
  it('Given warn level, When info request, Then suppressed', async () => {
    const cap = capture();
    const app = await withLoggedApp(
      createRequestLogging({ stream: cap.stream, level: 'warn' }),
      (a) => a.get('/ok', (_req, res) => res.json({ ok: true })),
    );
    try {
      assert.equal((await fetch(`${app.baseUrl}/ok`)).status, 200);
      assert.equal(cap.lines.length, 0);
    } finally {
      await app.close();
    }
  });

  it('Given unsupported level, When created, Then throws', () => {
    assert.throws(
      () => createRequestLogging({ level: 'verbose' }),
      /unsupported log level/,
    );
  });
});

async function listen(app) {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections?.();
      }),
  };
}

describe('Request logging in createApp', () => {
  it('Given wired app, When health and static, Then logged and errors stay problem+json', async () => {
    const cap = capture();
    const app = createApp({
      config: {},
      requestLogging: createRequestLogging({ stream: cap.stream }),
    });
    const server = await listen(app);
    try {
      const { base } = server;
      assert.equal((await fetch(`${base}/healthz`)).status, 200);
      assert.equal((await fetch(`${base}/`)).status, 200);
      const missing = await fetch(`${base}/api/rooms/NOPE`);
      assert.equal(missing.status, 404);
      assert.match(missing.headers.get('content-type') ?? '', /problem\+json/);
      assert.ok(cap.lines.length >= 3);
      assert.ok(cap.lines.every((l) => typeof l.req.path === 'string'));
    } finally {
      await server.close();
    }
  });
});
