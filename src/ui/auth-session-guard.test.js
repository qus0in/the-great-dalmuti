import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionGuard } from './public/js/auth-gate.js';

it('Given no session, When timeout fires, Then redirects', () => {
  let fired = null;
  let redirected = false;
  const guard = createSessionGuard({
    setTimer: (fn) => {
      fired = fn;
    },
    redirect: () => {
      redirected = true;
    },
    reload: () => {},
  });
  guard.start();
  assert.equal(typeof fired, 'function');
  fired();
  assert.equal(redirected, true);
});

it('Given session before timeout, When timeout fires, Then no redirect', () => {
  let fired = null;
  let redirected = false;
  let reloaded = false;
  const guard = createSessionGuard({
    setTimer: (fn) => {
      fired = fn;
    },
    redirect: () => {
      redirected = true;
    },
    reload: () => {
      reloaded = true;
    },
  });
  guard.start();
  guard.onSession({ user: { id: 'u1' } });
  assert.equal(reloaded, true);
  fired();
  assert.equal(redirected, false);
});

it('Given default, When started, Then waits ten seconds', () => {
  let ms = null;
  const guard = createSessionGuard({
    setTimer: (fn, timeout) => {
      ms = timeout;
    },
    redirect: () => {},
    reload: () => {},
  });
  guard.start();
  assert.equal(ms, 10000);
});
