import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APPEAL_MESSAGES } from './public/js/profile-appeal.js';
import { createFixture } from './profile-appeal-fixture.js';

it('가려짐 아닐 때 버튼 없음', async () => {
  const { card, els, appeal } = createFixture();
  card.hiddenKind = null;
  await appeal.sync();
  assert.equal(els.root.hidden, true);
  assert.equal(els.btn.hidden, true);
  assert.equal(els.form.hidden, true);
});

it('가려짐 미제출: 버튼 표시, 클릭 시 500자 textarea와 카운터 초기화', async () => {
  const { els, appeal } = createFixture();
  await appeal.sync();
  assert.equal(els.btn.hidden, false);
  assert.equal(els.form.hidden, true);
  els.btn.click();
  assert.equal(els.btn.hidden, true);
  assert.equal(els.form.hidden, false);
  assert.equal(els.count.textContent, '500자 남음');
  assert.equal(els.submit.disabled, true);
});

it('500자 경계: 0자 비활성, 1자·500자 정상 카운트, 501자 비활성', () => {
  const { els, appeal } = createFixture();
  appeal.showForm();
  els.textarea.input('');
  assert.equal(els.submit.disabled, true);
  assert.equal(els.count.textContent, '500자 남음');
  els.textarea.input('a');
  assert.equal(els.submit.disabled, false);
  assert.equal(els.count.textContent, '499자 남음');
  els.textarea.input('a'.repeat(500));
  assert.equal(els.submit.disabled, false);
  assert.equal(els.count.textContent, '0자 남음');
  els.textarea.input('a'.repeat(501));
  assert.equal(els.submit.disabled, true);
  assert.equal(els.count.textContent, '-1자 남음');
});

it('제출 성공: 문구 안내 및 폼 닫힘', async () => {
  const { els, appeal, inserts } = createFixture();
  appeal.showForm();
  els.textarea.input('억울합니다');
  await appeal.doSubmit();
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].table, 'profile_appeals');
  assert.deepEqual(inserts[0].row, { user_id: 'u-1', body: '억울합니다' });
  assert.equal(els.form.hidden, true);
  assert.equal(els.status.textContent, APPEAL_MESSAGES.submitted);
});

it('중복 제출(23505): 이미 이의제기 문구 안내', async () => {
  const { els, appeal } = createFixture({ error: { code: '23505' } });
  appeal.showForm();
  els.textarea.input('재시도');
  await appeal.doSubmit();
  assert.equal(els.form.hidden, true);
  assert.equal(els.status.textContent, APPEAL_MESSAGES.duplicate);
});

it('결과 조회 upheld: 유지 문구 표시, 버튼 숨김', async () => {
  const { els, appeal } = createFixture({ decision: 'upheld' });
  await appeal.sync();
  assert.equal(els.btn.hidden, true);
  assert.equal(els.form.hidden, true);
  assert.equal(els.status.textContent, APPEAL_MESSAGES.upheld);
});

it('index.html: maxlength 500 및 필수 data-appeal 요소 존재', () => {
  const html = readFileSync('src/ui/public/index.html', 'utf8');
  assert.match(html, /data-appeal="open"/);
  assert.match(html, /data-appeal="textarea"[^>]*maxlength="500"/);
  assert.match(html, /data-appeal="count"/);
  assert.match(html, /data-appeal="submit"/);
  assert.match(html, /data-appeal="status"/);
});
