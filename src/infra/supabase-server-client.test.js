import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseServerClient } from './supabase-server-client.js';

describe('Supabase server client', () => {
  it('Given url and secret key, When created, Then persistSession off', () => {
    const calls = [];
    const client = createSupabaseServerClient({
      url: 'https://test.supabase.co',
      secretKey: 'sb_secret_test',
      createClientImpl: (...args) => {
        calls.push(args);
        return { mock: true };
      },
    });

    assert.equal(client.mock, true);
    assert.equal(calls[0][0], 'https://test.supabase.co');
    assert.equal(calls[0][1], 'sb_secret_test');
    assert.deepEqual(calls[0][2], {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('Given missing url or secret key, When created, Then throws', () => {
    assert.throws(
      () => createSupabaseServerClient({ url: 'https://test.supabase.co' }),
      /required/,
    );
    assert.throws(
      () => createSupabaseServerClient({ secretKey: 's' }),
      /required/,
    );
  });
});
