import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp, startApp } from './main.js';

function withEnv() {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_pub_test_123';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_456';
  process.env.SUPABASE_JWKS_URL = 'https://test.supabase.co/jwks';
}

async function loadConfig() {
  return (await import('./infra/config/env.js')).loadConfig();
}

describe('Runtime wiring contract', () => {
  it('Given buildApp, When composed, Then sync Express app returned', async () => {
    withEnv();
    const app = buildApp({ config: await loadConfig() });
    assert.equal(typeof app.listen, 'function');
    assert.equal(typeof app.then, 'undefined');
  });

  it('Given injected runtime, When server closes, Then dispose called once', async () => {
    withEnv();
    let disposes = 0;
    const server = await startApp(0, {
      runtime: {
        dispose: () => {
          disposes += 1;
        },
      },
    });
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    assert.equal(disposes, 1);
  });
});
