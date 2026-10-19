import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideAuthGate,
  isOAuthReturn,
  isProtectedPage,
} from './public/js/auth-gate.js';

const user = { id: 'u1' };
const decide = (page, userValue, isOAuth) =>
  decideAuthGate({ page, user: userValue, isOAuth });

describe('isOAuthReturn', () => {
  it('Given pkce code query, When checked, Then true', () => {
    assert.equal(isOAuthReturn('?code=x', ''), true);
    assert.equal(isOAuthReturn('?mode=tutorial&code=x', ''), true);
  });
  it('Given implicit token hash, When checked, Then true', () => {
    assert.equal(isOAuthReturn('', '#access_token=x'), true);
  });
  it('Given plain addresses, When checked, Then false', () => {
    assert.equal(isOAuthReturn('', ''), false);
    assert.equal(isOAuthReturn('?mode=tutorial', ''), false);
    assert.equal(isOAuthReturn('?codex=1', ''), false);
  });
});

describe('decideAuthGate protected', () => {
  it('Given no user, When decided, Then to-login', () => {
    for (const page of ['hall', 'play', 'admin']) {
      assert.equal(decide(page, null, false), 'to-login');
    }
  });
  it('Given oauth return, When decided, Then wait', () => {
    for (const page of ['hall', 'play', 'admin']) {
      assert.equal(decide(page, null, true), 'wait');
    }
  });
  it('Given user, When decided, Then show', () => {
    for (const page of ['hall', 'play', 'admin']) {
      assert.equal(decide(page, user, false), 'show');
    }
  });
  it('Given pages, When classified, Then hall play admin only', () => {
    assert.equal(isProtectedPage('hall'), true);
    assert.equal(isProtectedPage('play'), true);
    assert.equal(isProtectedPage('login'), false);
  });
});

describe('decideAuthGate login', () => {
  it('Given user, When decided, Then to-home', () => {
    assert.equal(decide('login', user, false), 'to-home');
  });
  it('Given no user, When decided, Then show', () => {
    assert.equal(decide('login', null, false), 'show');
  });
  it('Given oauth return, When decided, Then wait', () => {
    assert.equal(decide('login', null, true), 'wait');
  });
  it('Given unknown page, When decided, Then show', () => {
    assert.equal(decide('lobby', null, false), 'show');
  });
});
