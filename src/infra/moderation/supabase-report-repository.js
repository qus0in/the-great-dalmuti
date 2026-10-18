import { createClient } from '@supabase/supabase-js';

function userClient({ createClientImpl, url, key, accessToken }) {
  return createClientImpl(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function holdAvatar(client, userId) {
  const path = `${userId}/avatar`;
  const { storage } = client;
  const copied = await storage
    .from('avatars')
    .copy(path, path, { destinationBucket: 'avatars_held' });
  const { error } = copied;
  if (error && Number(error.status) === 404) return { error: null };
  if (error) {
    const conflict =
      Number(error.status) === 409 || error.code === 'ResourceAlreadyExists';
    if (!conflict) return copied;
    const held = await storage.from('avatars_held').list(userId, {
      search: 'avatar',
    });
    if (held.error) return held;
    if (!(held.data || []).some((file) => file.name === 'avatar'))
      return copied;
  }
  return storage.from('avatars').remove([path]);
}

export function createSupabaseReportRepository({
  url,
  publishableKey,
  serviceClient,
  createClientImpl = createClient,
}) {
  return {
    insertReport: ({ accessToken, reporterId, targetId, reason }) =>
      userClient({ createClientImpl, url, key: publishableKey, accessToken })
        .from('reports')
        .insert({ reporter_id: reporterId, target_id: targetId, reason }),
    hiddenProfileKind: (targetId) =>
      serviceClient
        .from('hidden_profiles')
        .select('kind')
        .eq('user_id', targetId)
        .maybeSingle(),
    holdAvatar: (targetId) => holdAvatar(serviceClient, targetId),
  };
}
