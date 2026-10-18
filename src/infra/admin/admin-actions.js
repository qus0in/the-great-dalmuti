import { createAdminUserClient } from './admin-client.js';

function callerClient(options) {
  return (accessToken) => createAdminUserClient({ ...options, accessToken });
}

function databaseActions(options) {
  const userClient = callerClient(options);
  return {
    isAdmin: (token) => userClient(token).rpc('is_admin'),
    insertViolation: (token, userId, adminId) =>
      userClient(token).from('hidden_profiles').insert({
        user_id: userId,
        kind: 'violation',
        processed_by: adminId,
      }),
    confirmViolation: (token, userId) =>
      userClient(token).rpc('confirm_profile_violation', {
        target_user_id: userId,
      }),
    resolveModeration: (token, userId, result) =>
      userClient(token).rpc('resolve_profile_moderation', {
        target_user_id: userId,
        appeal_result: result,
      }),
    appealUserId: (token, appealId) =>
      userClient(token)
        .from('profile_appeals')
        .select('user_id')
        .eq('id', appealId)
        .maybeSingle(),
  };
}

function storageActions(serviceClient) {
  const pathFor = (userId) => `${userId}/avatar`;
  const bucket = (name) => serviceClient.storage.from(name);
  const remove = (name, userId) => bucket(name).remove([pathFor(userId)]);
  const removeOriginalAvatar = (userId) => remove('avatars', userId);
  const removeHeldAvatar = (userId) => remove('avatars_held', userId);
  const restoreHeldAvatar = async (userId) => {
    const path = pathFor(userId);
    const copied = await bucket('avatars_held').copy(path, path, {
      destinationBucket: 'avatars',
    });
    if (copied.error && Number(copied.error.status) === 404)
      return { error: null };
    if (copied.error) return copied;
    return bucket('avatars_held').remove([path]);
  };
  return { removeOriginalAvatar, removeHeldAvatar, restoreHeldAvatar };
}

export function adminActions(options) {
  return {
    ...databaseActions(options),
    ...storageActions(options.serviceClient),
  };
}
