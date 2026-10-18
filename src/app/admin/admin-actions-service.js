import { invalidId, reply, runAction, dbFailure } from './admin-service.js';

async function sequence(repository, steps) {
  for (const [work, code] of steps) {
    const failed = await runAction(work, code);
    if (failed) return failed;
  }
  return reply(200, { ok: true });
}

function violate(repository, { token, adminId, userId }) {
  const invalid = invalidId(userId);
  if (invalid) return invalid;
  return sequence(repository, [
    [
      () => repository.insertViolation(token, userId, adminId),
      'VIOLATION_FAILED',
    ],
    [() => repository.removeOriginalAvatar(userId), 'AVATAR_DELETE_FAILED'],
  ]);
}

function confirm(repository, token, userId) {
  const invalid = invalidId(userId);
  if (invalid) return invalid;
  return sequence(repository, [
    [() => repository.confirmViolation(token, userId), 'CONFIRM_FAILED'],
    [() => repository.removeHeldAvatar(userId), 'AVATAR_DELETE_FAILED'],
  ]);
}

function lift(repository, { token, userId, body = {} }) {
  const invalid = invalidId(userId);
  if (invalid) return invalid;
  if (body.appealResult !== undefined && body.appealResult !== 'lifted') {
    return reply(400, { error: 'INVALID_APPEAL_RESULT' });
  }
  return sequence(repository, [
    [() => repository.restoreHeldAvatar(userId), 'AVATAR_RESTORE_FAILED'],
    [
      () => repository.resolveModeration(token, userId, 'lifted'),
      'LIFT_FAILED',
    ],
  ]);
}

async function uphold(repository, token, appealId) {
  const invalid = invalidId(appealId);
  if (invalid) return invalid;
  let lookup;
  try {
    lookup = await repository.appealUserId(token, appealId);
  } catch {
    return reply(500, { error: 'APPEAL_LOOKUP_FAILED' });
  }
  if (lookup.error) return dbFailure(lookup.error, 'APPEAL_LOOKUP_FAILED');
  if (!lookup.data?.user_id) return reply(404, { error: 'APPEAL_NOT_FOUND' });
  return sequence(repository, [
    [
      () => repository.resolveModeration(token, lookup.data.user_id, 'upheld'),
      'UPHELD_FAILED',
    ],
  ]);
}

export function createAdminActions(repository) {
  return {
    violate: (token, adminId, userId) =>
      violate(repository, { token, adminId, userId }),
    confirm: (token, userId) => confirm(repository, token, userId),
    lift: (token, userId, body) => lift(repository, { token, userId, body }),
    uphold: (token, appealId) => uphold(repository, token, appealId),
  };
}
