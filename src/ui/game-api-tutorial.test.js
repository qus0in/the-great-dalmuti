import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient } from './public/js/http-client.js';
import { createGameApi } from './public/js/game-api.js';

it('Given tutorial mode, When createRoom is called, Then mode is sent in the body', async () => {
  const calls = [];
  const axios = {
    create: () => ({
      post: (url, body, config) => {
        calls.push({ url, body, config });
        return { data: { route: url, body } };
      },
    }),
  };
  const http = createHttpClient({
    axios,
    getToken: () => Promise.resolve('jwt-123'),
  });
  const api = createGameApi(http);

  await api.createRoom({ mode: 'tutorial' });

  assert.deepEqual(
    [calls[0].url, calls[0].body],
    ['/api/rooms', { mode: 'tutorial' }],
  );
  assert.equal(calls[0].config.headers.Authorization, 'Bearer jwt-123');
});
