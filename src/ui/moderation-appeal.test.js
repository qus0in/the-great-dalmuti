// 계약 4 — moderation-api: myAppeal (본인 행 decision 조회).
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { myAppeal } from './public/js/moderation-api.js';
function selectClient(result, calls) {
  return {
    from: (table) => ({
      select: (cols) => ({
        eq: (col, val) => ({
          order: (key, opts) => ({
            limit: (n) => {
              calls.push({ table, cols, col, val, key, opts, n });
              return result instanceof Error
                ? Promise.reject(result)
                : Promise.resolve(result);
            },
          }),
        }),
      }),
    }),
  };
}
it('myAppeal 성공: decision 반환·조회 조건', async () => {
  const calls = [];
  const client = selectClient(
    { data: [{ decision: 'upheld' }], error: null },
    calls,
  );
  assert.deepEqual(await myAppeal(client, 'me'), {
    ok: true,
    decision: 'upheld',
  });
  assert.deepEqual(calls[0].table, 'profile_appeals');
  assert.deepEqual(calls[0].val, 'me');
});
it('myAppeal 행 없음: decision null', async () => {
  const calls = [];
  const client = selectClient({ data: [], error: null }, calls);
  assert.deepEqual(await myAppeal(client, 'me'), { ok: true, decision: null });
});
it('myAppeal 오류·reject: failed', async () => {
  const calls = [];
  const denied = selectClient({ data: null, error: { code: '42501' } }, calls);
  assert.deepEqual(await myAppeal(denied, 'me'), { ok: false, code: 'failed' });
  const down = selectClient(new Error('net'), calls);
  assert.deepEqual(await myAppeal(down, 'me'), { ok: false, code: 'failed' });
});
