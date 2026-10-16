import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './server.js';

async function withServer(fn) {
  const server = await startServer({ port: 0, config: { publicConfig: {} } });
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
}

async function assertNotFoundPage(baseUrl, path) {
  const res = await fetch(`${baseUrl}${path}`);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  assert.match(await res.text(), /href="\/"/);
}

async function assertNotFoundApi(baseUrl, path) {
  const res = await fetch(`${baseUrl}${path}`);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') ?? '', /problem\+json/);
  assert.equal((await res.json()).status, 404);
}

describe('Not found handling', () => {
  it('Given unknown paths, When requested, Then 404 page or problem json', async () => {
    await withServer(async (baseUrl) => {
      await assertNotFoundPage(baseUrl, '/hall');
      await assertNotFoundPage(baseUrl, '/foo/bar');
      await assertNotFoundApi(baseUrl, '/api/nope');
    });
  });
});
