import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './server.js';

const FAKE_CONFIG = Object.freeze({
  publicConfig: Object.freeze({
    supabaseUrl: 'https://test-project.supabase.co',
    supabasePublishableKey: 'sb_pub_test_sentinel_xyz',
  }),
  getSecretKey: () => 'SECRET_SENTINEL_TOKEN_LEAK_GUARD_999',
  getJwksUrl: () => 'https://test-project.supabase.co/SECRET_SENTINEL_JWKS',
});

async function withServer(fn) {
  const server = await startServer({ port: 0, config: FAKE_CONFIG });
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

async function assertHtmlOk(baseUrl, path) {
  const res = await fetch(`${baseUrl}${path}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
}

async function assertMoved(baseUrl, path, location) {
  const res = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), location);
}

async function assertStaticAssets(baseUrl) {
  const cssRes = await fetch(`${baseUrl}/css/tokens.css`);
  assert.equal(cssRes.status, 200);
  assert.match(cssRes.headers.get('content-type') ?? '', /text\/css/);

  const notFound = await fetch(`${baseUrl}/missing-file-404.xyz`);
  assert.equal(notFound.status, 404);
}

describe('Static routes and public config', () => {
  it('Given clean URLs, When requesting page paths, Then serves html with 200', async () => {
    await withServer(async (baseUrl) => {
      await assertHtmlOk(baseUrl, '/');
      await assertHtmlOk(baseUrl, '/play');
      await assertStaticAssets(baseUrl);
    });
  });

  it('Given html file paths, When requested, Then 301 to clean URL keeping query', async () => {
    await withServer(async (baseUrl) => {
      await assertMoved(baseUrl, '/play.html', '/play');
      await assertMoved(baseUrl, '/index.html?a=1', '/?a=1');
    });
  });

  it('Given /api/config, When requested, Then returns public fields with cache control', async () => {
    await withServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/config`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('cache-control') ?? '', /public/);
      const json = await res.json();
      assert.deepEqual(json, {
        supabaseUrl: 'https://test-project.supabase.co',
        supabasePublishableKey: 'sb_pub_test_sentinel_xyz',
      });
    });
  });
});

describe('Secret leak test', () => {
  it('Given fake env with secret sentinel, When querying endpoints, Then sentinel is never leaked', async () => {
    const sentinel = 'SECRET_SENTINEL_TOKEN_LEAK_GUARD_999';
    const jwksSentinel = 'SECRET_SENTINEL_JWKS';
    const endpoints = ['/', '/play.html', '/api/config', '/css/tokens.css'];

    await withServer(async (baseUrl) => {
      for (const path of endpoints) {
        const res = await fetch(`${baseUrl}${path}`);
        const body = await res.text();
        assert.ok(!body.includes(sentinel), `Leak detected at ${path}`);
        assert.ok(!body.includes(jwksSentinel), `Leak detected at ${path}`);
      }
    });
  });
});
