import { createClient } from '@supabase/supabase-js';

export function createAdminUserClient({
  url,
  publishableKey,
  accessToken,
  createClientImpl = createClient,
}) {
  return createClientImpl(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export async function listAuthUsers(serviceClient) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    const pageUsers = data?.users ?? [];
    users.push(...pageUsers.filter((user) => user.is_anonymous !== true));
    if (pageUsers.length < 1000) return users;
  }
}

export function authUserName(user) {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    '이름 없음'
  );
}
