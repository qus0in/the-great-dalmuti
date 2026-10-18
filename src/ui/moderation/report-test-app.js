import { createReportUser } from '../../app/moderation/report-user.js';
import { requireAuth } from '../http/require-auth.js';
import { createReportRouter } from './report-router.js';
import { createApp } from '../server.js';

function fakeRepository() {
  const calls = { reports: [], moved: [] };
  return {
    calls,
    insertReport: (row) => {
      calls.reports.push(row);
      if (row.reporterId === 'anon')
        return Promise.resolve({ error: { code: '42501' } });
      if (row.targetId === 'dup')
        return Promise.resolve({ error: { code: '23505' } });
      return Promise.resolve({ error: null });
    },
    hiddenProfileKind: (targetId) =>
      Promise.resolve({
        data: targetId === 'suspect' ? { kind: 'suspect' } : null,
        error: null,
      }),
    holdAvatar: (targetId) => {
      calls.moved.push(targetId);
      return Promise.resolve({ error: null });
    },
  };
}

export function reportTestApp() {
  const repository = fakeRepository();
  const identities = { member: { id: 'reporter' }, anonymous: { id: 'anon' } };
  const requireUser = requireAuth({
    tokenVerifier: {
      verify: (token) => Promise.resolve(identities[token] || null),
    },
  });
  const reportRouter = createReportRouter({
    requireAuth: requireUser,
    reportUser: createReportUser(repository),
  });
  return { app: createApp({ reportRouter }), repository };
}

export async function withReportServer(app, run) {
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections?.();
    });
  }
}

export async function postReport(base, token, body) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}/api/reports`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}
