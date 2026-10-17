import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient } from './public/js/http-client.js';

function createFakeAxios(handler) {
  const created = [];
  const calls = [];
  return {
    created,
    calls,
    create: (options) => {
      created.push(options);
      return {
        get: async (url, config) => {
          calls.push({ method: 'GET', url, body: undefined, config });
          return handler
            ? await handler({ method: 'GET', url, config })
            : { data: { ok: true } };
        },
        post: async (url, body, config) => {
          calls.push({ method: 'POST', url, body, config });
          return handler
            ? await handler({ method: 'POST', url, body, config })
            : { data: { ok: true } };
        },
      };
    },
  };
}

it('Given getToken, When get and post run, Then baseURL is / and Bearer token is injected per call', async () => {
  let count = 0;
  const axios = createFakeAxios();
  const http = createHttpClient({
    axios,
    getToken: () => {
      count += 1;
      return Promise.resolve(`tok-${count}`);
    },
  });

  await http.get('/api/stats', { headers: { 'X-Custom': '1' } });
  await http.post('/api/rooms', { a: 1 });

  assert.deepEqual(axios.created, [{ baseURL: '/' }]);
  assert.equal(axios.calls.length, 2);
  assert.deepEqual(axios.calls[0].config.headers, {
    'X-Custom': '1',
    Authorization: 'Bearer tok-1',
  });
  assert.equal(axios.calls[1].config.headers.Authorization, 'Bearer tok-2');
});

it('Given null token, When get runs, Then Authorization header is omitted', async () => {
  const axios = createFakeAxios();
  const http = createHttpClient({
    axios,
    getToken: () => Promise.resolve(null),
  });

  await http.get('/api/config');

  assert.equal(axios.calls[0].config.headers.Authorization, undefined);
});

function problemError() {
  const err = new Error('Request failed with status code 409');
  err.response = {
    status: 409,
    data: {
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: 'Room is full',
      code: 'ROOM_FULL',
    },
  };
  return err;
}

it('Given Problem Details error response, When request fails, Then throws Error with status, code, title', async () => {
  const axios = createFakeAxios(() => Promise.reject(problemError()));
  const http = createHttpClient({
    axios,
    getToken: () => Promise.resolve('jwt'),
  });

  await assert.rejects(
    () => http.post('/api/rooms/ROOM01/join'),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.status, 409);
      assert.equal(err.code, 'ROOM_FULL');
      assert.equal(err.title, 'Conflict');
      assert.equal(err.message, 'Room is full');
      return true;
    },
  );
});
