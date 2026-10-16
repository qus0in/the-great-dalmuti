import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRequestLogging } from './request-logging.js';

export function capture() {
  const lines = [];
  return {
    lines,
    stream: {
      write: (s) => {
        lines.push(JSON.parse(s));
      },
    },
  };
}

export async function withLoggedApp(middleware, routes) {
  const app = express();
  app.use(middleware);
  app.use(express.json());
  routes(app);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections?.();
      }),
  };
}

const SECRET = 'sentinel-s3cr3t-9z';

function routes(app) {
  app.get('/ok', (_req, res) => res.json({ ok: true }));
  app.post('/echo', (req, res) => res.json({ ok: true }));
  app.get('/missing-here', (_req, res) => res.status(404).json({ gone: true }));
  app.get('/boom', () => {
    throw new Error(`boom ${SECRET}-err`);
  });
}

describe('Request logging whitelist 2xx', () => {
  it('Given 2xx, When logged, Then info with id/method/path/status/time only', async () => {
    const cap = capture();
    const app = await withLoggedApp(
      createRequestLogging({ stream: cap.stream }),
      routes,
    );
    try {
      const res = await fetch(`${app.baseUrl}/ok?token=${SECRET}`, {
        headers: { 'x-auth': SECRET, cookie: `s=${SECRET}` },
      });
      assert.equal(res.status, 200);
      assert.equal(cap.lines.length, 1);
      const [log] = cap.lines;
      assert.equal(log.level, 30);
      assert.deepEqual(log.req, { id: 1, method: 'GET', path: '/ok' });
      assert.deepEqual(log.res, { statusCode: 200 });
      assert.equal(typeof log.responseTime, 'number');
      assert.equal(JSON.stringify(log).includes(SECRET), false);
    } finally {
      await app.close();
    }
  });
});

describe('Request logging whitelist errors', () => {
  it('Given 404 and 500, When logged, Then warn and error without err leak', async () => {
    const cap = capture();
    const app = await withLoggedApp(
      createRequestLogging({ stream: cap.stream }),
      routes,
    );
    try {
      assert.equal((await fetch(`${app.baseUrl}/missing-here`)).status, 404);
      assert.equal((await fetch(`${app.baseUrl}/boom`)).status, 500);
      assert.deepEqual(
        cap.lines.map((l) => l.level),
        [40, 50],
      );
      assert.equal(JSON.stringify(cap.lines).includes(SECRET), false);
      assert.equal(JSON.stringify(cap.lines).includes('stack'), false);
    } finally {
      await app.close();
    }
  });
});
