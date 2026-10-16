import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './server.js';

describe('Server smoke test', () => {
  it('Given an Express server, When requesting GET /, Then it responds with 200 and HTML', async () => {
    // Given
    const server = await startServer(0);
    const { port } = server.address();

    try {
      // When
      const response = await fetch(`http://127.0.0.1:${port}/`);
      const body = await response.text();

      // Then
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') ?? '', /text\/html/);
      assert.ok(body.includes('<!DOCTYPE html>') || body.includes('<html'));
    } finally {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
