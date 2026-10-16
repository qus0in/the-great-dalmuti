import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toProblem, errorMiddleware, notFoundHandler } from './errors.js';

function res() {
  const out = { statusCode: null, body: null, headers: {} };
  out.status = (value) => {
    out.statusCode = value;
    return out;
  };
  out.type = (value) => {
    out.headers['content-type'] = value;
    return out;
  };
  out.setHeader = (k, v) => {
    out.headers[k.toLowerCase()] = v;
    return out;
  };
  out.json = (value) => {
    out.body = value;
    return out;
  };
  return out;
}

function handle(err) {
  const r = res();
  errorMiddleware(err, { url: '/x' }, r, () => {});
  return { problem: r.body, r };
}

describe('Problem details mapping', () => {
  it('Given validation error, When toProblem called, Then 400', () => {
    const problem = toProblem({ issues: [] }, { url: '/x' });
    assert.equal(problem.status, 400);
    assert.equal(problem.type, 'about:blank');
  });

  it('Given DomainError, When handled, Then 422 no stack', () => {
    const err = new Error('rule');
    err.name = 'DomainError';
    err.code = 'NOT_HIGHER';
    const { problem, r } = handle(err);
    assert.equal(problem.status, 422);
    assert.equal(problem.detail, 'rule');
    assert.equal(r.headers['content-type'], 'application/problem+json');
    assert.equal(problem.stack, undefined);
  });

  it('Given mapped codes, When handled, Then statuses match', () => {
    assert.equal(handle({ code: 'NOT_YOUR_TURN' }).problem.status, 409);
    assert.equal(handle({ code: 'ROUND_ENDED' }).problem.status, 410);
    assert.equal(handle({ code: 'FORBIDDEN' }).problem.status, 403);
    assert.equal(
      handle(Object.assign(new Error('auth'), { name: 'AuthenticationError' }))
        .problem.status,
      401,
    );
    assert.equal(handle({ code: 'RATE_LIMITED' }).problem.status, 429);
    assert.equal(handle({ code: 'SUPABASE_ERROR' }).problem.status, 503);
  });
});

describe('Problem details security', () => {
  it('Given unknown error, When handled, Then 500 generic detail', () => {
    const { problem } = handle(new Error('secret'));
    assert.equal(problem.status, 500);
    assert.equal(problem.detail, 'An unexpected error occurred.');
    assert.notEqual(problem.detail, 'secret');
  });

  it('Given request, When notFoundHandler called, Then 404', () => {
    const r = res();
    notFoundHandler({ url: '/missing' }, r, undefined);
    assert.equal(r.statusCode, 404);
    assert.equal(r.body.status, 404);
    assert.equal(r.headers['content-type'], 'application/problem+json');
  });
});
