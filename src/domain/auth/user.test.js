import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthUser, DomainError } from './user.js';

describe('AuthUser full attributes and freezing', () => {
  it('Given complete user attributes, When createAuthUser is called, Then returns frozen AuthUser with all fields', () => {
    const user = createAuthUser({
      id: 'usr-123',
      email: 'user@example.com',
      name: '달무티',
      avatarUrl: 'https://example.com/avatar.png',
    });

    assert.deepEqual(user, {
      id: 'usr-123',
      email: 'user@example.com',
      name: '달무티',
      avatarUrl: 'https://example.com/avatar.png',
    });
    assert.ok(Object.isFrozen(user));
    assert.throws(() => {
      user.name = '농노';
    }, TypeError);
  });
});

describe('AuthUser optional field normalization', () => {
  it('Given only id, When createAuthUser is called, Then optional fields normalize to null', () => {
    const user = createAuthUser({ id: 'usr-456' });

    assert.equal(user.id, 'usr-456');
    assert.equal(user.email, null);
    assert.equal(user.name, null);
    assert.equal(user.avatarUrl, null);
    assert.ok(Object.isFrozen(user));
  });

  it('Given non-string or whitespace-only optional fields, When createAuthUser is called, Then normalizes to null', () => {
    const user = createAuthUser({
      id: 'usr-789',
      email: '   ',
      name: null,
      avatarUrl: undefined,
    });

    assert.equal(user.email, null);
    assert.equal(user.name, null);
    assert.equal(user.avatarUrl, null);
  });
});

describe('AuthUser validation and domain error', () => {
  it('Given missing or invalid id, When createAuthUser is called, Then throws DomainError', () => {
    assert.throws(
      () => createAuthUser(),
      (err) =>
        err instanceof DomainError && err.code === 'INVALID_AUTH_USER_ID',
    );
    assert.throws(
      () => createAuthUser({ id: '' }),
      (err) =>
        err instanceof DomainError && err.code === 'INVALID_AUTH_USER_ID',
    );
    assert.throws(
      () => createAuthUser({ id: '   ' }),
      (err) =>
        err instanceof DomainError && err.code === 'INVALID_AUTH_USER_ID',
    );
    assert.throws(
      () => createAuthUser({ id: 12345 }),
      (err) =>
        err instanceof DomainError && err.code === 'INVALID_AUTH_USER_ID',
    );
  });
});
