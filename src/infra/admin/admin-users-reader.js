import { authUserName, listAuthUsers } from './admin-client.js';

async function rows({ client, table, columns, configure = (q) => q }) {
  const result = await configure(client.from(table).select(columns));
  if (result.error) throw result.error;
  return result.data ?? [];
}

function reportCounts(reports) {
  const counts = new Map();
  for (const row of reports)
    counts.set(row.target_id, (counts.get(row.target_id) ?? 0) + 1);
  return counts;
}

function userRows({ users, hidden, counts, search }) {
  const term = String(search).trim().toLocaleLowerCase();
  return users
    .map((user) => ({
      userId: user.id,
      name: authUserName(user),
      createdAt: user.created_at,
      reportCount: counts.get(user.id) ?? 0,
      status: hidden.get(user.id) ?? 'none',
    }))
    .filter((user) => !term || user.name.toLocaleLowerCase().includes(term));
}

export async function readAdminUsers({ client, serviceClient, search = '' }) {
  const [profiles, reports, users] = await Promise.all([
    rows({ client, table: 'hidden_profiles_admin', columns: 'user_id,kind' }),
    rows({
      client,
      table: 'reports',
      columns: 'target_id',
      configure: (q) => q.is('resolved_at', null),
    }),
    listAuthUsers(serviceClient),
  ]);
  const hidden = new Map(profiles.map((row) => [row.user_id, row.kind]));
  return userRows({ users, hidden, counts: reportCounts(reports), search });
}
