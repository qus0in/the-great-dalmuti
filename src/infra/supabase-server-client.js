import { createClient } from '@supabase/supabase-js';

// 서버 전용 Supabase 클라이언트: secret 키를 쓰고 세션을 브라우저처럼 저장하지 않는다
export function createSupabaseServerClient({
  url,
  secretKey,
  createClientImpl = createClient,
}) {
  if (!url || !secretKey) {
    throw new Error('Supabase url and secret key are required');
  }
  return createClientImpl(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
