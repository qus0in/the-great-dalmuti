import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createSupabaseTokenVerifier } from './supabase-token-verifier.js';

const clientWith = (getUser) => ({ auth: { getUser } });
const verifierFor = (getUser) =>
  createSupabaseTokenVerifier({ client: clientWith(getUser) });

const fullUser = {
  id: 'user-1',
  email: 'a@example.com',
  user_metadata: {
    full_name: '테스트 사용자',
    avatar_url: 'https://example.com/a.png',
  },
};

describe('Supabase token verifier success', () => {
  it('Given valid token, When verify, Then profile returned', async () => {
    const verifier = verifierFor(() =>
      Promise.resolve({ data: { user: fullUser }, error: null }),
    );
    assert.deepEqual(await verifier.verify('jwt-token'), {
      id: 'user-1',
      email: 'a@example.com',
      name: '테스트 사용자',
      avatarUrl: 'https://example.com/a.png',
    });
  });

  it('Given user without metadata, When verify, Then null fields', async () => {
    const verifier = verifierFor(() =>
      Promise.resolve({
        data: { user: { id: 'user-2', email: null } },
        error: null,
      }),
    );
    assert.deepEqual(await verifier.verify('jwt-token'), {
      id: 'user-2',
      email: null,
      name: null,
      avatarUrl: null,
    });
  });
});

describe('Supabase token verifier failure', () => {
  it('Given getUser error, When verify, Then null', async () => {
    const verifier = verifierFor(() =>
      Promise.resolve({ data: { user: null }, error: { message: 'bad' } }),
    );
    assert.equal(await verifier.verify('bad-token'), null);
  });

  it('Given no user, When verify, Then null', async () => {
    const verifier = verifierFor(() =>
      Promise.resolve({ data: { user: null }, error: null }),
    );
    assert.equal(await verifier.verify('jwt-token'), null);
  });

  it('Given thrown error, When verify, Then null', async () => {
    const verifier = verifierFor(() =>
      Promise.reject(new Error('fetch failed')),
    );
    assert.equal(await verifier.verify('jwt-token'), null);
  });
});

describe('Supabase token verifier wiring', () => {
  it('Given url and key only, When create, Then verify returned', () => {
    const verifier = createSupabaseTokenVerifier({
      url: 'https://example.supabase.co',
      key: 'publishable-key',
    });
    assert.equal(typeof verifier.verify, 'function');
  });
});
