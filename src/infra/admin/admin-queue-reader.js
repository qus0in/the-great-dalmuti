import { authUserName, listAuthUsers } from './admin-client.js';

async function query({ client, table, columns, configure = (q) => q }) {
  const result = await configure(client.from(table).select(columns));
  if (result.error) throw result.error;
  return result.data ?? [];
}

function reportIndex(rows) {
  const index = new Map();
  for (const { target_id: id, reason } of rows) {
    const item = index.get(id) ?? {
      reportCount: 0,
      reasons: { photo: 0, chat: 0, other: 0 },
    };
    item.reportCount += 1;
    item.reasons[reason] += 1;
    index.set(id, item);
  }
  return index;
}

function suspectsFor(profiles, counts, names) {
  return profiles
    .filter((row) => row.kind === 'suspect')
    .map((row) => ({
      userId: row.user_id,
      name: names.get(row.user_id) ?? '이름 없음',
      ...(counts.get(row.user_id) ?? {
        reportCount: 0,
        reasons: { photo: 0, chat: 0, other: 0 },
      }),
      since: row.hidden_at,
    }));
}

function appealsFor(rows, kinds, names) {
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: names.get(row.user_id) ?? '이름 없음',
    body: row.body,
    createdAt: row.created_at,
    kind: kinds.get(row.user_id) ?? 'suspect',
  }));
}

export async function readAdminQueue({ client, serviceClient }) {
  const [profiles, reports, appeals, users] = await Promise.all([
    query({
      client,
      table: 'hidden_profiles_admin',
      columns: 'user_id,kind,hidden_at',
    }),
    query({
      client,
      table: 'reports',
      columns: 'target_id,reason',
      configure: (q) => q.is('resolved_at', null),
    }),
    query({
      client,
      table: 'profile_appeals',
      columns: 'id,user_id,body,created_at',
      configure: (q) =>
        q.is('decision', null).order('created_at', { ascending: false }),
    }),
    listAuthUsers(serviceClient),
  ]);
  const names = new Map(users.map((user) => [user.id, authUserName(user)]));
  const kinds = new Map(profiles.map((row) => [row.user_id, row.kind]));
  return {
    suspects: suspectsFor(profiles, reportIndex(reports), names),
    appeals: appealsFor(appeals, kinds, names),
  };
}
