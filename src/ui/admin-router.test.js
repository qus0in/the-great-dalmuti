import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createAdminRouter } from './admin-router.js';
import { createApp } from './server.js';

async function withServer(app, run) {
  const server = await new Promise((resolve) => {
    const current = app.listen(0, () => resolve(current));
  });
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
}

function adminRepository() {
  return {
    isAdmin: (token) =>
      Promise.resolve({ data: token === 'admin', error: null }),
    queue: () => Promise.resolve({ suspects: [], appeals: [] }),
  };
}

it('blocks non-admins with contract 403 and serves the clean admin page', async () => {
  const router = createAdminRouter({
    requireAuth: (req, _res, next) => {
      Object.assign(req, { authUser: { id: 'admin-id' } });
      next();
    },
    repository: adminRepository(),
  });
  await withServer(createApp({ adminRouter: router }), async (base) => {
    const denied = await fetch(`${base}/api/admin/queue`, {
      headers: { authorization: 'Bearer member' },
    });
    assert.equal(denied.status, 403);
    assert.deepEqual(await denied.json(), { error: 'FORBIDDEN' });
    const allowed = await fetch(`${base}/api/admin/queue`, {
      headers: { authorization: 'Bearer admin' },
    });
    assert.equal(allowed.status, 200);
    assert.deepEqual(await allowed.json(), { suspects: [], appeals: [] });
    const page = await fetch(`${base}/admin`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type') ?? '', /text\/html/);
  });
});
