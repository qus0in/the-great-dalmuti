import { it } from 'node:test';
import assert from 'node:assert/strict';
import { MOD, cardOn } from './profile-card-fixture.js';

// 계약 2 — upload(avatarPath(uid), file, { upsert: true, contentType })
it('계약 2: 업로드 경로·옵션, 성공 시 version·redraw·안내 해제', async () => {
  const { card, uploads, root } = cardOn(null);
  const file = { type: 'image/png', size: 1048576 };
  await card.select(file);
  assert.deepEqual(uploads[0].bucket, 'avatars');
  assert.deepEqual(uploads[0].path, 'u-1/avatar');
  assert.deepEqual(uploads[0].file, file);
  assert.deepEqual(uploads[0].options, {
    upsert: true,
    contentType: 'image/png',
  });
  assert.equal(card.card.version, 1);
  assert.deepEqual(root.avatars.at(-1).className, 'avatar avatar--lg');
  assert.equal(root.els.notice.hidden, true);
  assert.equal(root.els.notice.textContent, '');
});

it('계약 2: 반복 업로드마다 캐시 version이 올라간다', async () => {
  const { card } = cardOn(null);
  await card.select({ type: 'image/webp', size: 10 });
  await card.select({ type: 'image/png', size: 10 });
  assert.equal(card.card.version, 2);
  assert.equal(
    MOD.renderCalls.at(-1).view.url,
    'https://avatars.test/u-1/avatar?v=2',
  );
});

it('결정 2: 검사 위반은 안내만 하고 업로드하지 않는다', async () => {
  const { card, uploads, root } = cardOn(null);
  await card.select({ type: 'image/png', size: 1048577 });
  assert.deepEqual(uploads, []);
  assert.equal(root.els.notice.textContent, MOD.NOTICES.size);
  assert.equal(root.els.notice.hidden, false);
  await card.select({ type: 'image/gif', size: 10 });
  assert.equal(root.els.notice.textContent, MOD.NOTICES.format);
});

it('업로드 실패: 실패 안내, version 유지, redraw 없음', async () => {
  const { card, root, uploads } = cardOn(null, { error: { message: '거부' } });
  await card.select({ type: 'image/jpeg', size: 10 });
  assert.equal(root.els.notice.textContent, MOD.NOTICES.uploadFail);
  assert.equal(root.els.notice.hidden, false);
  assert.equal(card.card.version, 0);
  assert.deepEqual(root.avatars, []);
  assert.equal(uploads.length, 1);
});

it('업로드 reject: 실패 안내, rejection 밖으로 새지 않음', async () => {
  const { card, root, uploads } = cardOn(null, new Error('네트워크 실패'));
  // await가 예외 없이 끝나는 것이 reject가 select 밖으로 새지 않음의 근거다.
  await card.select({ type: 'image/jpeg', size: 10 });
  assert.equal(uploads.length, 1);
  assert.equal(root.els.notice.textContent, MOD.NOTICES.uploadFail);
  assert.equal(root.els.notice.hidden, false);
});

// 결정 26 — 가려진 동안(의심) 업로드 막음, 실루엣 view
it('결정 26: rpc suspect → 잠금·실루엣·선택 막음', async () => {
  const { card, uploads, root } = cardOn('suspect');
  await card.loadHiddenState();
  assert.equal(card.card.hiddenKind, 'suspect');
  assert.equal(root.els.notice.textContent, MOD.NOTICES.suspect);
  assert.equal(root.els.change.disabled, true);
  assert.equal(MOD.renderCalls.at(-1).view.hidden, true);
  await card.select({ type: 'image/png', size: 10 });
  assert.deepEqual(uploads, []);
});

it('rpc 실패·other: 잠금 없음(실제 차단은 서버 정책이 맡는다)', async () => {
  const guard = () => Promise.reject(new Error('rpc down'));
  for (const rpcData of [guard, 'other']) {
    const { card, root } = cardOn(rpcData);
    await card.loadHiddenState();
    assert.equal(card.card.hiddenKind, null);
    assert.equal(root.els.change.disabled, false);
    assert.equal(root.els.input.disabled, false);
  }
});

it('rpc null: 사진 view가 계약 2 props로 그려진다', async () => {
  const { card, root } = cardOn(null);
  await card.loadHiddenState();
  assert.deepEqual(MOD.renderCalls.at(-1).view, {
    userId: 'u-1',
    name: '로아',
    isBot: false,
    hidden: false,
    url: 'https://avatars.test/u-1/avatar',
    size: 'lg',
  });
  assert.equal(root.els.notice.hidden, true);
  assert.equal(root.avatars.length, 1);
});
