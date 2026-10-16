import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AuthenticationError } from '../../app/auth/authenticate.js';
import { requireAuth } from './require-auth.js';

const run = (middleware, req) =>
  new Promise((resolve) => {
    middleware(req, {}, resolve);
  });

const verifierWith = (verify) => ({ verify });

describe('Require auth middleware success', () => {
  it('Given valid bearer token, When middleware runs, Then authUser set', async () => {
    const middleware = requireAuth({
      tokenVerifier: verifierWith(() =>
        Promise.resolve({ id: 'u1', name: '달무티' }),
      ),
    });
    const req = { headers: { authorization: 'Bearer good' } };

    const err = await run(middleware, req);

    assert.equal(err, undefined);
    assert.deepEqual(req.authUser, { id: 'u1', name: '달무티' });
  });
});

describe('Require auth middleware failure', () => {
  it('Given invalid token, When middleware runs, Then AuthenticationError', async () => {
    const middleware = requireAuth({
      tokenVerifier: verifierWith(() => Promise.resolve(null)),
    });
    const req = { headers: { authorization: 'Bearer bad' } };

    const err = await run(middleware, req);

    assert.ok(err instanceof AuthenticationError);
    assert.equal(req.authUser, undefined);
  });

  it('Given missing header, When middleware runs, Then AuthenticationError', async () => {
    const middleware = requireAuth({
      tokenVerifier: verifierWith(() => Promise.resolve({ id: 'u1' })),
    });
    const req = { headers: {} };

    const err = await run(middleware, req);

    assert.ok(err instanceof AuthenticationError);
  });

  it('Given verifier error, When middleware runs, Then AuthenticationError', async () => {
    const middleware = requireAuth({
      tokenVerifier: verifierWith(() =>
        Promise.reject(new Error('network down')),
      ),
    });
    const req = { headers: { authorization: 'Bearer good' } };

    const err = await run(middleware, req);

    assert.ok(err instanceof AuthenticationError);
    assert.equal(req.authUser, undefined);
  });
});
