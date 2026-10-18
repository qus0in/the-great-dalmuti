import { authUserName, listAuthUsers } from './admin-client.js';

async function rows({ client, table, columns, configure = (q) => q }) {
  const result = await configure(client.from(table).select(columns));
  if (result.error) throw result.error;
  return result.data ?? [];
}

function historyRows({ profiles, reports, appeals, users }) {
  const names = new Map(users.map((user) => [user.id, authUserName(user)]));
  const resolvedAt = new Map(
    reports
      .filter((row) => row.resolved_at)
      .map((row) => [row.target_id, Date.parse(row.resolved_at)]),
  );
  const profilesHistory = profiles
    .filter((row) => row.kind === 'violation')
    .map((row) => ({
      userId: row.user_id,
      name: names.get(row.user_id) ?? '이름 없음',
      action:
        resolvedAt.get(row.user_id) === Date.parse(row.hidden_at)
          ? 'confirm'
          : 'violation',
      by: names.get(row.processed_by) ?? '관리자',
      at: row.hidden_at,
    }));
  const appealsHistory = appeals.map((row) => ({
    userId: row.user_id,
    name: names.get(row.user_id) ?? '이름 없음',
    action: row.decision === 'upheld' ? 'upheld' : 'lift',
    by: '관리자',
    at: row.processed_at,
  }));
  return [...profilesHistory, ...appealsHistory]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 50);
}

export async function readAdminHistory({ client, serviceClient }) {
  const [profiles, reports, appeals, users] = await Promise.all([
    rows({
      client,
      table: 'hidden_profiles_admin',
      columns: 'user_id,kind,processed_by,hidden_at',
    }),
    rows({ client, table: 'reports', columns: 'target_id,resolved_at' }),
    rows({
      client,
      table: 'profile_appeals',
      columns: 'user_id,decision,processed_at',
      configure: (q) => q.not('decision', 'is', null),
    }),
    listAuthUsers(serviceClient),
  ]);
  return historyRows({ profiles, reports, appeals, users });
}
