import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient } from './public/js/http-client.js';
import { createGameApi } from './public/js/game-api.js';

function setupApi(token = 'jwt-123', onCall) {
  const calls = [];
  const axios = {
    create: () => ({
      get: async (url, config) => {
        calls.push({ method: 'GET', url, body: undefined, config });
        if (onCall) return await onCall({ method: 'GET', url, config });
        return { data: { route: url } };
      },
      post: async (url, body, config) => {
        calls.push({ method: 'POST', url, body, config });
        if (onCall) return await onCall({ method: 'POST', url, body, config });
        return { data: { route: url, body } };
      },
    }),
  };
  const http = createHttpClient({
    axios,
    getToken: () => Promise.resolve(token),
  });
  return { api: createGameApi(http), calls };
}

it('Given room endpoints, When called, Then method, path, body, header, and data match', async () => {
  const { api, calls } = setupApi();

  assert.deepEqual(await api.createRoom(), {
    route: '/api/rooms',
    body: undefined,
  });
  assert.deepEqual(await api.joinRoom('R1'), {
    route: '/api/rooms/R1/join',
    body: undefined,
  });
  assert.deepEqual(await api.getRoom('R1'), { route: '/api/rooms/R1' });
  assert.deepEqual(await api.startGame('R1'), {
    route: '/api/rooms/R1/start',
    body: undefined,
  });

  assert.equal(calls.length, 4);
  for (const call of calls) {
    assert.equal(call.config.headers.Authorization, 'Bearer jwt-123');
  }
  assert.equal(calls[2].method, 'GET');
});

it('Given play and stats endpoints, When called, Then method, path, and payload match schema', async () => {
  const { api, calls } = setupApi();
  const returns = { 0: [{ id: 'c-12-1' }] };

  await api.playCards('R1', 2, ['c-6-1', 'c-6-2']);
  await api.pass('R1', 3);
  await api.tribute('R1', 4, returns);
  await api.revolution('R1', 5);
  await api.getStats();

  assert.deepEqual(
    calls.map((c) => [c.method, c.url, c.body]),
    [
      [
        'POST',
        '/api/rooms/R1/plays',
        { version: 2, cards: ['c-6-1', 'c-6-2'] },
      ],
      ['POST', '/api/rooms/R1/pass', { version: 3 }],
      ['POST', '/api/rooms/R1/tribute', { version: 4, returns }],
      ['POST', '/api/rooms/R1/revolution', { version: 5 }],
      ['GET', '/api/stats', undefined],
    ],
  );
});

it('Given server 422 Problem Details, When playCards fails, Then normalized Error is thrown', async () => {
  const { api } = setupApi('jwt-123', () => {
    const err = new Error('Unprocessable');
    err.response = {
      status: 422,
      data: {
        status: 422,
        code: 'INVALID_PLAY',
        title: 'Unprocessable Entity',
        detail: 'Cannot beat current trick',
      },
    };
    return Promise.reject(err);
  });

  await assert.rejects(() => api.playCards('R1', 1, ['c-9-1']), {
    status: 422,
    code: 'INVALID_PLAY',
    title: 'Unprocessable Entity',
  });
});
