export class AuthenticationError extends Error {
  constructor(message = 'Authentication required', code = 'UNAUTHENTICATED') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

function parseBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    throw new AuthenticationError(
      'Missing Authorization header',
      'UNAUTHENTICATED',
    );
  }

  const parts = authorizationHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    throw new AuthenticationError(
      'Invalid Authorization header format',
      'UNAUTHENTICATED',
    );
  }

  return parts[1];
}

async function verifyToken(tokenVerifier, token) {
  try {
    const user = await tokenVerifier.verify(token);
    if (!user) {
      throw new AuthenticationError(
        'Invalid or expired authentication token',
        'UNAUTHENTICATED',
      );
    }
    return user;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError(
      'Token verification failed',
      'UNAUTHENTICATED',
    );
  }
}

export async function authenticate(
  { tokenVerifier } = {},
  authorizationHeader,
) {
  if (!tokenVerifier || typeof tokenVerifier.verify !== 'function') {
    throw new AuthenticationError(
      'Token verifier port is required',
      'UNAUTHENTICATED',
    );
  }

  const token = parseBearerToken(authorizationHeader);
  return await verifyToken(tokenVerifier, token);
}
