import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createAdminActions } from './admin-actions-service.js';

const USER = 'd7f6d4b2-21b4-4ac3-8f1d-0123456789ab';
const APPEAL = 'f4f7b08c-8f5d-4920-83a4-0123456789ab';

function fakeRepository(calls) {
  const log =
    (name) =>
    (...args) => {
      calls.push([name, ...args]);
      return Promise.resolve(
        name === 'appealUserId' ? { data: { user_id: USER } } : { error: null },
      );
    };
  return Object.fromEntries(
    [
      'insertViolation',
      'removeOriginalAvatar',
      'confirmViolation',
      'removeHeldAvatar',
      'restoreHeldAvatar',
      'resolveModeration',
      'appealUserId',
    ].map((name) => [name, log(name)]),
  );
}

it('runs DB and Storage ports in contract order with fixed identifiers', async () => {
  const calls = [];
  const actions = createAdminActions(fakeRepository(calls));
  assert.deepEqual(await actions.violate('jwt', 'admin', USER), {
    status: 200,
    body: { ok: true },
  });
  assert.deepEqual(await actions.confirm('jwt', USER), {
    status: 200,
    body: { ok: true },
  });
  assert.deepEqual(await actions.lift('jwt', USER), {
    status: 200,
    body: { ok: true },
  });
  assert.deepEqual(await actions.uphold('jwt', APPEAL), {
    status: 200,
    body: { ok: true },
  });
  assert.deepEqual(calls, [
    ['insertViolation', 'jwt', USER, 'admin'],
    ['removeOriginalAvatar', USER],
    ['confirmViolation', 'jwt', USER],
    ['removeHeldAvatar', USER],
    ['restoreHeldAvatar', USER],
    ['resolveModeration', 'jwt', USER, 'lifted'],
    ['appealUserId', 'jwt', APPEAL],
    ['resolveModeration', 'jwt', USER, 'upheld'],
  ]);
});

it('rejects path-like ids before calling DB or Storage ports', async () => {
  const calls = [];
  const result = await createAdminActions(fakeRepository(calls)).violate(
    'jwt',
    'admin',
    `${USER}/avatar`,
  );
  assert.equal(result.status, 400);
  assert.deepEqual(calls, []);
});
