// 신고·이의제기 브라우저 API — 신고는 서버, 이의제기는 DB 직접.
export const REPORT_REASONS = ['photo', 'chat', 'other'];
export const APPEAL_MAX = 500;
const DUP = '23505';
const failedOf = (error) => ({
  ok: false,
  code: error && error.code === DUP ? 'duplicate' : 'failed',
});
async function insertRow(client, table, row) {
  try {
    const { error } = await client.from(table).insert(row);
    return error ? failedOf(error) : { ok: true };
  } catch {
    return { ok: false, code: 'failed' };
  }
}
// eslint-disable-next-line max-params -- contract signature (client, me, targetId, reason)
export function reportUser(client, me, targetId, reason) {
  if (!me || !targetId || me === targetId) {
    return Promise.resolve({ ok: false, code: 'self' });
  }
  if (REPORT_REASONS.indexOf(reason) === -1) {
    return Promise.resolve({ ok: false, code: 'reason' });
  }
  return submitReport(client, targetId, reason);
}
async function submitReport(client, targetId, reason) {
  try {
    const { data, error } = await client.auth.getSession();
    const token = data?.session?.access_token;
    if (error || !token) return { ok: false, code: 'failed' };
    // eslint-disable-next-line compat/compat -- same-origin API; IE11 is unsupported.
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetId, reason }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 409 && result.error === 'DUPLICATE') {
      return { ok: false, code: DUP };
    }
    return response.ok ? { ok: true } : { ok: false, code: 'failed' };
  } catch {
    return { ok: false, code: 'failed' };
  }
}
export function submitAppeal(client, me, body) {
  const text = typeof body === 'string' ? body : '';
  if (!me || text.length < 1 || text.length > APPEAL_MAX) {
    return Promise.resolve({ ok: false, code: 'body' });
  }
  return insertRow(client, 'profile_appeals', { user_id: me, body: text });
}
export async function myAppeal(client, me) {
  try {
    const { data, error } = await client
      .from('profile_appeals')
      .select('decision')
      .eq('user_id', me)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) return { ok: false, code: 'failed' };
    const rows = data || [];
    return { ok: true, decision: rows[0] ? rows[0].decision : null };
  } catch {
    return { ok: false, code: 'failed' };
  }
}
