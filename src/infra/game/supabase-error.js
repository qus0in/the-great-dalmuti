// Supabase 업스트림 에러 정의 (status-rules 503 매핑)

export class SupabaseError extends Error {
  constructor(message = 'Supabase operation failed', cause) {
    super(message);
    this.name = 'SupabaseError';
    this.code = 'SUPABASE_ERROR';
    if (cause) this.cause = cause;
  }
}

export function assertOk(res) {
  if (res?.error) {
    throw new SupabaseError(res.error.message ?? 'Supabase error', res.error);
  }
}
