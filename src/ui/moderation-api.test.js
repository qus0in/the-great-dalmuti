import { it } from 'node:test';
import assert from 'node:assert/strict';
import { submitAppeal } from './public/js/moderation-api.js';

function insertClient(result, calls) {
  return {
    from: (table) => ({
      insert: (row) => {
        calls.push({ table, row });
        return Promise.resolve(result);
      },
    }),
  };
}

it('이의제기 제출 성공 및 500자 경계', async () => {
  const calls = [];
  const client = insertClient({ error: null }, calls);
  assert.deepEqual(await submitAppeal(client, 'me', 'x'.repeat(500)), {
    ok: true,
  });
  assert.deepEqual(calls[0], {
    table: 'profile_appeals',
    row: { user_id: 'me', body: 'x'.repeat(500) },
  });
  assert.deepEqual(await submitAppeal(client, 'me', ''), {
    ok: false,
    code: 'body',
  });
  assert.deepEqual(await submitAppeal(client, 'me', 'x'.repeat(501)), {
    ok: false,
    code: 'body',
  });
});

it('이의제기 중복·저장 오류 처리', async () => {
  const calls = [];
  const duplicate = insertClient({ error: { code: '23505' } }, calls);
  assert.deepEqual(await submitAppeal(duplicate, 'me', '사유'), {
    ok: false,
    code: 'duplicate',
  });
});
