import { createClient } from '@supabase/supabase-js';
import { adminActions } from './admin-actions.js';
import { createAdminUserClient } from './admin-client.js';
import { readAdminHistory } from './admin-history-reader.js';
import { readAdminQueue } from './admin-queue-reader.js';
import { readAdminUsers } from './admin-users-reader.js';

export function createSupabaseAdminRepository({
  url,
  publishableKey,
  serviceClient,
  createClientImpl = createClient,
}) {
  const options = { url, publishableKey, serviceClient, createClientImpl };
  const clientFor = (accessToken) => ({
    client: createAdminUserClient({
      url,
      publishableKey,
      accessToken,
      createClientImpl,
    }),
    serviceClient,
  });
  return {
    ...adminActions(options),
    queue: (token) => readAdminQueue(clientFor(token)),
    users: (token, search) => readAdminUsers({ ...clientFor(token), search }),
    history: (token) => readAdminHistory(clientFor(token)),
  };
}
