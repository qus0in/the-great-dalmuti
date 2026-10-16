import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigError, createConfig, validateEnv } from './env.js';

const VALID_ENV = Object.freeze({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key',
  SUPABASE_SECRET_KEY: 'sb_secret_super_secret',
  SUPABASE_JWKS_URL: 'https://example.supabase.co/auth/v1/jwks.json',
});

describe('Environment validation', () => {
  it('Given valid env object, When validateEnv is called, Then does not throw', () => {
    assert.doesNotThrow(() => validateEnv(VALID_ENV));
  });

  it('Given missing env keys, When validateEnv is called, Then throws ConfigError with key names only', () => {
    const invalidEnv = { SUPABASE_URL: 'https://example.supabase.co' };
    assert.throws(
      () => validateEnv(invalidEnv),
      (err) => {
        assert.ok(err instanceof ConfigError);
        assert.equal(err.name, 'ConfigError');
        assert.ok(err.message.includes('SUPABASE_PUBLISHABLE_KEY'));
        assert.ok(err.message.includes('SUPABASE_SECRET_KEY'));
        assert.ok(err.message.includes('SUPABASE_JWKS_URL'));
        assert.ok(!err.message.includes('example.supabase.co'));
        return true;
      },
    );
  });
});

describe('Config creation and security boundary', () => {
  it('Given valid env, When createConfig is called, Then publicConfig has public fields only', () => {
    const config = createConfig(VALID_ENV);
    assert.deepEqual(config.publicConfig, {
      supabaseUrl: 'https://example.supabase.co',
      supabasePublishableKey: 'sb_publishable_test_key',
    });
    assert.equal(config.getSecretKey(), 'sb_secret_super_secret');
    assert.equal(
      config.getJwksUrl(),
      'https://example.supabase.co/auth/v1/jwks.json',
    );
  });

  it('Given config object, When serialized or keys inspected, Then secrets are not exposed', () => {
    const config = createConfig(VALID_ENV);
    const serialized = JSON.stringify(config);
    assert.ok(!serialized.includes('sb_secret_super_secret'));
    assert.deepEqual(Object.keys(config), [
      'publicConfig',
      'getSecretKey',
      'getJwksUrl',
    ]);
  });
});
