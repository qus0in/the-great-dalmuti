const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (status, body) => ({ status, body });

export function dbFailure(error, code) {
  const forbidden = error?.code === '42501' || Number(error?.status) === 403;
  return reply(forbidden ? 403 : 500, {
    error: forbidden ? 'FORBIDDEN' : code,
  });
}

export const invalidId = (id) =>
  !UUID.test(String(id ?? '')) ? reply(400, { error: 'INVALID_ID' }) : null;

export async function runAction(work, code) {
  try {
    const result = await work();
    return result?.error ? dbFailure(result.error, code) : null;
  } catch {
    return reply(500, { error: code });
  }
}

export function createAdminService(repository) {
  const read = async (work, code) => {
    try {
      return reply(200, await work());
    } catch {
      return reply(500, { error: code });
    }
  };
  return {
    authorize: async (token) => {
      try {
        const result = await repository.isAdmin(token);
        if (result.error) return dbFailure(result.error, 'ADMIN_CHECK_FAILED');
        return result.data === true
          ? reply(200, { ok: true })
          : reply(403, { error: 'FORBIDDEN' });
      } catch {
        return reply(500, { error: 'ADMIN_CHECK_FAILED' });
      }
    },
    queue: (token) => read(() => repository.queue(token), 'QUEUE_FAILED'),
    users: (token, search) =>
      read(() => repository.users(token, search), 'USERS_FAILED'),
    history: (token) => read(() => repository.history(token), 'HISTORY_FAILED'),
  };
}

export { reply };
