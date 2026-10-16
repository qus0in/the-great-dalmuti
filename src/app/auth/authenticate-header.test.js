import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authenticate, AuthenticationError } from './authenticate.js';

describe('Authenticate missing header validation', () => {
  const dummyVerifier = {
    verify() {
      return Promise.resolve(null);
    },
  };

  it('Given missing or non-string authorization header, When authenticate is called, Then throws AuthenticationError', async () => {
    await assert.rejects(
      authenticate({ tokenVerifier: dummyVerifier }, null),
      (err) =>
        err instanceof AuthenticationError &&
        err.name === 'AuthenticationError' &&
        err.code === 'UNAUTHENTICATED',
    );

    await assert.rejects(
      authenticate({ tokenVerifier: dummyVerifier }, ''),
      (err) =>
        err instanceof AuthenticationError && err.code === 'UNAUTHENTICATED',
    );
  });
});

describe('Authenticate malformed header validation', () => {
  const dummyVerifier = {
    verify() {
      return Promise.resolve(null);
    },
  };

  it('Given malformed authorization header, When authenticate is called, Then throws AuthenticationError', async () => {
    const malformedHeaders = [
      'Basic dXNlcjpwYXNz',
      'Bearer',
      'Bearer ',
      'Bearer token extra-part',
      'bearer-token-without-space',
    ];

    for (const header of malformedHeaders) {
      await assert.rejects(
        authenticate({ tokenVerifier: dummyVerifier }, header),
        (err) =>
          err instanceof AuthenticationError && err.code === 'UNAUTHENTICATED',
      );
    }
  });
});
