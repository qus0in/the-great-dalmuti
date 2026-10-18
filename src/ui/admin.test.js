import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createAdminController, showForbidden } from './public/js/admin.js';
import { createFakeApi, setupAdminTree } from './admin-setup-fixture.js';

const tick = () =>
  new Promise((r) => {
    setTimeout(r, 5);
  });

it('탭 전환: 탭 클릭 시 활성화 상태 변경 및 해당 목록 조회', async () => {
  const { root, tQ, tU, tH, q, u, h } = setupAdminTree();
  const api = createFakeApi();
  await createAdminController({ root, api }).reload();

  assert.equal(tQ.getAttribute('aria-selected'), 'true');
  assert.equal(q.hidden, false);
  assert.equal(api.calls[0].method, 'getQueue');

  tU.click();
  await tick();
  assert.equal(tU.getAttribute('aria-selected'), 'true');
  assert.equal(u.hidden, false);

  tH.click();
  await tick();
  assert.equal(tH.getAttribute('aria-selected'), 'true');
  assert.equal(h.hidden, false);
});

it('버튼 동작과 API 호출 인자', async () => {
  const { root, tU, form, input } = setupAdminTree();
  const api = createFakeApi();
  await createAdminController({ root, api }).reload();
  const click = async (sel) => {
    root.querySelector(sel).click();
    await tick();
  };

  await click('button[data-action="suspect-lift"]');
  assert.equal(api.calls.at(-2)?.id, 'u1');
  await click('button[data-action="suspect-confirm"]');
  assert.equal(api.calls.at(-2)?.method, 'confirmUser');
  await click('button[data-action="appeal-lift"]');
  assert.equal(api.calls.at(-2)?.appealResult, 'lifted');
  await click('button[data-action="appeal-upheld"]');
  assert.equal(api.calls.at(-2)?.method, 'upheldAppeal');

  tU.click();
  await tick();
  await click('button[data-action="user-violate"]');
  assert.equal(api.calls.at(-2)?.method, 'violateUser');

  input.value = '테스트';
  form.submit();
  await tick();
  assert.equal(api.calls.at(-1)?.q, '테스트');
});

it('403 접근 제한: 에러 발생 시 안내 문구 및 화면 숨김', async () => {
  const { root, app, forbidden, fbMsg } = setupAdminTree();
  const api = createFakeApi({
    getQueue: () => Promise.reject(Object.assign(new Error(), { status: 403 })),
  });
  await createAdminController({
    root,
    api,
    onForbidden: () => showForbidden(root),
  }).reload();

  assert.equal(app.hidden, true);
  assert.equal(forbidden.hidden, false);
  assert.equal(fbMsg.textContent, '관리자만 볼 수 있어요.');
});

it('XSS 안전: 이의제기 본문은 textContent로 렌더링', async () => {
  const evil = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const { root } = setupAdminTree();
  const appeals = [
    { id: 'a1', userId: 'u1', name: '홍', body: evil, kind: 'suspect' },
  ];
  const api = createFakeApi({
    getQueue: () => Promise.resolve({ suspects: [], appeals }),
  });
  await createAdminController({ root, api }).reload();

  const bodyEl = root.querySelector('.admin-item__body');
  assert.equal(bodyEl.textContent, evil);
  assert.equal(bodyEl.children.length, 0);
});
