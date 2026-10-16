import { createClient } from '@supabase/supabase-js';

function toAuthUser(user) {
  return {
    id: user.id,
    email: user.email ?? null,
    name: user.user_metadata?.full_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
  };
}

function createDefaultClient(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabaseTokenVerifier({ url, key, client }) {
  const supabase = client ?? createDefaultClient(url, key);

  return {
    async verify(accessToken) {
      try {
        const { data, error } = await supabase.auth.getUser(accessToken);
        if (error || !data?.user) {
          return null;
        }
        return toAuthUser(data.user);
      } catch {
        return null;
      }
    },
  };
}
