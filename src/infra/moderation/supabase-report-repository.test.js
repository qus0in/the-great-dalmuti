import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseReportRepository } from './supabase-report-repository.js';

function userClientOf(calls) {
  const captured = calls;
  return {
    from: (table) => ({
      insert: (row) => {
        captured.report = { table, row };
        return Promise.resolve({ error: null });
      },
    }),
  };
}

function storageOf(calls) {
  const captured = calls;
  return {
    from: (bucket) => ({
      copy: (from, to, options) => {
        captured.copy = { bucket, from, to, options };
        return Promise.resolve({ error: null });
      },
      remove: (paths) => {
        captured.remove = { bucket, paths };
        return Promise.resolve({ error: null });
      },
      list: () => Promise.resolve({ data: [], error: null }),
    }),
  };
}

function repositoryOf(calls) {
  const captured = calls;
  const userClient = userClientOf(calls);
  const serviceClient = {
    from: () => ({
      select: () => ({
        eq: (_column, userId) => ({
          maybeSingle: () =>
            Promise.resolve({ data: { kind: 'suspect', userId }, error: null }),
        }),
      }),
    }),
    storage: storageOf(calls),
  };
  return createSupabaseReportRepository({
    url: 'https://example.test',
    publishableKey: 'public-key',
    serviceClient,
    createClientImpl: (...args) => {
      captured.client = args;
      return userClient;
    },
  });
}

it('신고 저장에 사용자 JWT를 쓰고 hidden profile은 service client로 읽는다', async () => {
  const calls = {};
  const repository = repositoryOf(calls);
  await repository.insertReport({
    accessToken: 'user-jwt',
    reporterId: 'reporter',
    targetId: 'target',
    reason: 'chat',
  });
  assert.equal(calls.client[1], 'public-key');
  assert.equal(calls.client[2].global.headers.Authorization, 'Bearer user-jwt');
  assert.deepEqual(calls.report, {
    table: 'reports',
    row: { reporter_id: 'reporter', target_id: 'target', reason: 'chat' },
  });
  assert.equal(
    (await repository.hiddenProfileKind('target')).data.kind,
    'suspect',
  );
});

it('suspect avatar is copied into the private bucket before public removal', async () => {
  const calls = {};
  await repositoryOf(calls).holdAvatar('target');
  assert.deepEqual(calls.copy, {
    bucket: 'avatars',
    from: 'target/avatar',
    to: 'target/avatar',
    options: { destinationBucket: 'avatars_held' },
  });
  assert.deepEqual(calls.remove, {
    bucket: 'avatars',
    paths: ['target/avatar'],
  });
});
