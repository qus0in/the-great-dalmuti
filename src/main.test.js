import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from './main.js';

describe('Application composition root', () => {
  it('Given valid env, When startApp is called, Then starts server on available port', async () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_pub_test_123';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_root_sentinel_xyz';
    process.env.SUPABASE_JWKS_URL = 'https://test.supabase.co/jwks';

    const server = await startApp(0);
    const { port } = server.address();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/config`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.supabaseUrl, 'https://test.supabase.co');
      assert.equal(json.supabasePublishableKey, 'sb_pub_test_123');
    } finally {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});
