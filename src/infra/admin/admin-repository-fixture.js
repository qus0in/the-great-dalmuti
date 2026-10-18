const USER = 'd7f6d4b2-21b4-4ac3-8f1d-0123456789ab';
const path = `${USER}/avatar`;

function serviceClient(calls) {
  const bucket = (name) => ({
    remove: (paths) => {
      calls.push(['remove', name, paths]);
      return Promise.resolve({ error: null });
    },
    copy: (...args) => {
      calls.push(['copy', name, ...args]);
      return Promise.resolve({ error: null });
    },
  });
  return { storage: { from: bucket } };
}

function userClient(calls) {
  return (_url, _key, options) => ({
    rpc: (name, args) => {
      calls.push(['rpc', options.global.headers.Authorization, name, args]);
      return Promise.resolve({ data: true, error: null });
    },
    from: (table) => ({
      insert: (row) => {
        calls.push([
          'insert',
          options.global.headers.Authorization,
          table,
          row,
        ]);
        return Promise.resolve({ error: null });
      },
    }),
  });
}

function expectedDbCalls() {
  return [
    ['rpc', 'Bearer caller-jwt', 'is_admin', undefined],
    [
      'insert',
      'Bearer caller-jwt',
      'hidden_profiles',
      {
        user_id: USER,
        kind: 'violation',
        processed_by: 'admin-id',
      },
    ],
    [
      'rpc',
      'Bearer caller-jwt',
      'confirm_profile_violation',
      { target_user_id: USER },
    ],
    [
      'rpc',
      'Bearer caller-jwt',
      'resolve_profile_moderation',
      {
        target_user_id: USER,
        appeal_result: 'lifted',
      },
    ],
  ];
}

function expectedStorageCalls() {
  return [
    ['remove', 'avatars', [path]],
    ['remove', 'avatars_held', [path]],
    ['copy', 'avatars_held', path, path, { destinationBucket: 'avatars' }],
    ['remove', 'avatars_held', [path]],
  ];
}

export function expectedCalls() {
  return [...expectedDbCalls(), ...expectedStorageCalls()];
}

export function createFakeRepository(calls, createRepository) {
  return createRepository({
    url: 'https://example.test',
    publishableKey: 'public',
    serviceClient: serviceClient(calls),
    createClientImpl: userClient(calls),
  });
}

export async function exercise(repository) {
  await repository.isAdmin('caller-jwt');
  await repository.insertViolation('caller-jwt', USER, 'admin-id');
  await repository.confirmViolation('caller-jwt', USER);
  await repository.resolveModeration('caller-jwt', USER, 'lifted');
  await repository.removeOriginalAvatar(USER);
  await repository.removeHeldAvatar(USER);
  await repository.restoreHeldAvatar(USER);
}
