import { createAdminApi } from './admin-api.js';
import { createAdminController } from './admin-controller.js';

export { createAdminApi } from './admin-api.js';
export { createAdminController } from './admin-controller.js';

export function showForbidden(root, msg = '관리자만 볼 수 있어요.') {
  const app = root.querySelector('[data-admin="app"]');
  if (app) app.hidden = true;
  const fb = root.querySelector('[data-admin="forbidden"]');
  if (fb) {
    fb.hidden = false;
    const msgEl = fb.querySelector('[data-admin="forbidden-message"]') || fb;
    msgEl.textContent = msg;
  }
}

export async function bootstrap(
  root = document.querySelector('[data-admin="root"]'),
) {
  if (!root) return null;
  const { getClient } = await import('./auth.js');
  const { createHttpClient } = await import('./http-client.js');
  const { default: axios } =
    await import('https://cdn.jsdelivr.net/npm/axios@1.20.0/+esm');
  const client = await getClient();
  const getToken = () =>
    client.auth
      .getSession()
      .then(({ data }) => data.session?.access_token ?? null);
  const http = createHttpClient({ axios, getToken });
  return createAdminController({
    root,
    api: createAdminApi(http),
    onForbidden: () => showForbidden(root),
  });
}

if (typeof window !== 'undefined' && !window.__TEST__) {
  bootstrap();
}
