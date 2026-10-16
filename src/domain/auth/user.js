export class DomainError extends Error {
  constructor(message, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

function normalizeString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createAuthUser({ id, email, name, avatarUrl } = {}) {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new DomainError('AuthUser id is required', 'INVALID_AUTH_USER_ID');
  }

  return Object.freeze({
    id: id.trim(),
    email: normalizeString(email),
    name: normalizeString(name),
    avatarUrl: normalizeString(avatarUrl),
  });
}
