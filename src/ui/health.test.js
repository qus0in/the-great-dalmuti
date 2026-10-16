import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHealth, healthHandler, HEALTH_PATH } from './health.js';

function res() {
  const out = { statusCode: null, body: null, headers: {} };
  out.status = (value) => {
    out.statusCode = value;
    return out;
  };
  out.set = (k, v) => {
    out.headers[k.toLowerCase()] = v;
    return out;
  };
  out.json = (value) => {
    out.body = value;
    return out;
  };
  out.end = () => {
    out.body = null;
    return out;
  };
  return out;
}

describe('Health handler', () => {
  it('Given health check, When GET called, Then status ok no store', () => {
    const out = res();
    healthHandler({ method: 'GET' }, out);
    assert.equal(out.statusCode, 200);
    assert.deepEqual(out.body, { status: 'ok' });
    assert.equal(out.headers['cache-control'], 'no-store');
  });

  it('Given health request, When HEAD called, Then 200 no body', () => {
    const out = res();
    healthHandler({ method: 'HEAD' }, out);
    assert.equal(out.statusCode, 200);
    assert.equal(out.body, null);
  });
});

describe('Health route registration', () => {
  it('When registerHealth called, Then GET and HEAD routes are registered before static', () => {
    const routes = [];
    const app = {
      get(path, handler) {
        routes.push({ method: 'GET', path, handler });
      },
      head(path, handler) {
        routes.push({ method: 'HEAD', path, handler });
      },
    };
    const result = registerHealth(app);
    assert.equal(result, app);
    assert.equal(routes[0].path, HEALTH_PATH);
    assert.equal(routes[1].method, 'HEAD');
  });
});
