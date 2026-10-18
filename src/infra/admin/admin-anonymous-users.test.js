import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseAdminRepository } from './supabase-admin-repository.js';

function usersService() {
  return {
    auth: {
      admin: {
        listUsers: () =>
          Promise.resolve({
            data: {
              users: [
                { id: 'member', is_anonymous: false },
                { id: 'anon', is_anonymous: true },
              ],
            },
            error: null,
          }),
      },
    },
  };
}

function queryClient() {
  return () => ({
    from: () => ({
      select: () => ({
        is: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  });
}

it('filters anonymous accounts from the admin users response', async () => {
  const repo = createSupabaseAdminRepository({
    url: 'https://example.test',
    publishableKey: 'public',
    serviceClient: usersService(),
    createClientImpl: queryClient(),
  });
  const users = await repo.users('caller-jwt', '');
  assert.deepEqual(
    users.map((user) => user.userId),
    ['member'],
  );
});
