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

describe('Login page route', () => {
  it('Given login page, When requested, Then serves html with 200', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/login`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') ?? '', /text\/html/);
    });
  });
});
