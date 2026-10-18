import { it } from 'node:test';
import assert from 'node:assert/strict';
import { reportUser } from './public/js/moderation-api.js';

const clientOf = (token) => ({
  auth: {
    getSession: () =>
      Promise.resolve({
        data: { session: token ? { access_token: token } : null },
        error: null,
      }),
  },
});
const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});
async function withFetch(fetchImpl, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

it('reportUser posts target and reason with the current bearer token', async () => {
  await withFetch(
    (url, init) => {
      assert.equal(url, '/api/reports');
      assert.equal(init.method, 'POST');
      assert.equal(init.headers.Authorization, 'Bearer jwt-token');
      assert.deepEqual(JSON.parse(init.body), {
        targetId: 'target',
        reason: 'photo',
      });
      return Promise.resolve(response(201, { ok: true }));
    },
    async () => {
      assert.deepEqual(
        await reportUser(clientOf('jwt-token'), 'me', 'target', 'photo'),
        {
          ok: true,
        },
      );
    },
  );
});

it('reportUser maps server duplicate to the Supabase code 23505', async () => {
  await withFetch(
    () => Promise.resolve(response(409, { error: 'DUPLICATE' })),
    async () => {
      assert.deepEqual(
        await reportUser(clientOf('jwt'), 'me', 'target', 'chat'),
        {
          ok: false,
          code: '23505',
        },
      );
    },
  );
});

it('reportUser validates before fetch and handles missing session or server error', async () => {
  let calls = 0;
  await withFetch(
    () => {
      calls += 1;
      return Promise.resolve(response(500, {}));
    },
    async () => {
      assert.deepEqual(await reportUser(clientOf('jwt'), 'me', 'me', 'photo'), {
        ok: false,
        code: 'self',
      });
      assert.deepEqual(
        await reportUser(clientOf(null), 'me', 'target', 'photo'),
        {
          ok: false,
          code: 'failed',
        },
      );
      assert.deepEqual(
        await reportUser(clientOf('jwt'), 'me', 'target', 'photo'),
        {
          ok: false,
          code: 'failed',
        },
      );
    },
  );
  assert.equal(calls, 1);
});
