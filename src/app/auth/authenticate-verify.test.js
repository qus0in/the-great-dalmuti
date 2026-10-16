import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authenticate, AuthenticationError } from './authenticate.js';
import { createAuthUser } from '../../domain/auth/user.js';

describe('Authenticate success scenario', () => {
  it('Given valid Bearer header and valid token, When authenticate is called, Then returns verified AuthUser', async () => {
    const expectedUser = createAuthUser({
      id: 'usr-123',
      email: 'user@example.com',
      name: '달무티',
      avatarUrl: 'https://example.com/avatar.png',
    });

    const fakeTokenVerifier = {
      verify(token) {
        if (token === 'valid-token') {
          return Promise.resolve(expectedUser);
        }
        return Promise.resolve(null);
      },
    };

    const user = await authenticate(
      { tokenVerifier: fakeTokenVerifier },
      'Bearer valid-token',
    );

    assert.deepEqual(user, expectedUser);
  });
});

describe('Authenticate token verification failure', () => {
  it('Given tokenVerifier returns null, When authenticate is called, Then throws AuthenticationError', async () => {
    const nullVerifier = {
      verify() {
        return Promise.resolve(null);
      },
    };

    await assert.rejects(
      authenticate({ tokenVerifier: nullVerifier }, 'Bearer expired-jwt'),
      (err) =>
        err instanceof AuthenticationError &&
        err.name === 'AuthenticationError' &&
        err.code === 'UNAUTHENTICATED',
    );
  });

  it('Given tokenVerifier throws an error, When authenticate is called, Then throws AuthenticationError', async () => {
    const failingVerifier = {
      verify() {
        return Promise.reject(new Error('Supabase network failure'));
      },
    };

    await assert.rejects(
      authenticate({ tokenVerifier: failingVerifier }, 'Bearer invalid-jwt'),
      (err) =>
        err instanceof AuthenticationError && err.code === 'UNAUTHENTICATED',
    );
  });
});

describe('Authenticate missing verifier port', () => {
  it('Given missing or invalid tokenVerifier port, When authenticate is called, Then throws AuthenticationError', async () => {
    await assert.rejects(
      authenticate({}, 'Bearer token-123'),
      (err) =>
        err instanceof AuthenticationError && err.code === 'UNAUTHENTICATED',
    );
    await assert.rejects(
      authenticate({ tokenVerifier: null }, 'Bearer token-123'),
      (err) =>
        err instanceof AuthenticationError && err.code === 'UNAUTHENTICATED',
    );
  });
});
