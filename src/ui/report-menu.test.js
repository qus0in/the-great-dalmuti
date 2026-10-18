// 계약 1·2 — 신고 메뉴: 진입점별 기본 사유, 제출 결과, Esc·닫기.
import { it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isReportable,
  mountReportMenu,
  REPORT_DONE,
  REPORT_DUP,
  REPORT_FAIL,
} from './public/js/report-menu.js';
function node() {
  const listeners = {};
  const el = {
    children: [],
    attrs: {},
    hidden: false,
    value: '',
    checked: false,
    textContent: '',
    className: '',
    setAttribute: (k, v) => (el.attrs[k] = v),
    appendChild: (c) => el.children.push(c),
    append: (...cs) => el.children.push(...cs),
    addEventListener: (t, fn) => {
      (listeners[t] = listeners[t] || []).push(fn);
    },
    emit: (t, ev) => Promise.all((listeners[t] || []).map((f) => f(ev))),
  };
  return el;
}
function docOf() {
  return { createElement: () => node(), body: { appendChild: () => {} } };
}
function menuOf(result, seen) {
  const calls = [];
  // eslint-disable-next-line max-params -- matches the reportUser interface.
  const reportUserImpl = (_client, me, targetId, reason) => {
    calls.push({ reporter_id: me, target_id: targetId, reason });
    return result;
  };
  const menu = mountReportMenu(docOf(), {
    client: {},
    me: 'me',
    reportUserImpl,
    onDone: (res, target) => seen.push({ res, target }),
  });
  return { menu, calls };
}
function checkedOf(menu) {
  const form = menu.root.children[0];
  const labels = form.children.filter(
    (c) => c.className === 'report-menu__reason',
  );
  const inputs = labels.map((label) => label.children[0]);
  return inputs.find((input) => input.checked);
}
it('본인·봇에게는 메뉴 없음(isReportable)', () => {
  assert.equal(isReportable({ me: 'me', targetId: 'me' }), false);
  assert.equal(isReportable({ me: 'me', targetId: 'u2', isBot: true }), false);
  assert.equal(isReportable({ me: 'me' }), false);
  assert.equal(isReportable({ me: 'me', targetId: 'u2' }), true);
});
it('진입점별 기본 사유: 채팅은 chat, 좌석은 photo', () => {
  const { menu } = menuOf({ ok: true }, []);
  menu.open('u2', 'chat');
  assert.equal(checkedOf(menu).value, 'chat');
  menu.open('u3', 'photo');
  assert.equal(checkedOf(menu).value, 'photo');
  menu.open('u4', 'weird');
  assert.equal(checkedOf(menu).value, 'other');
  assert.equal(menu.open(''), false);
});
it('제출 성공·Esc·닫기', async () => {
  const seen = [];
  const { menu, calls } = menuOf({ ok: true }, seen);
  menu.open('u2', 'chat');
  const form = menu.root.children[0];
  await form.emit('submit', { preventDefault: () => {} });
  assert.equal(calls[0].target_id, 'u2');
  assert.equal(menu.root.children[1].textContent, REPORT_DONE);
  assert.equal(seen[0].res.ok, true);
  menu.root.emit('keydown', { key: 'Escape' });
  assert.equal(menu.root.hidden, true);
});
it('중복·실패 안내 문구', async () => {
  const dup = menuOf({ ok: false, code: '23505' }, []);
  dup.menu.open('u2', 'photo');
  await dup.menu.root.children[0].emit('submit', { preventDefault: () => {} });
  assert.equal(dup.menu.root.children[1].textContent, REPORT_DUP);
  const fail = menuOf({ ok: false, code: 'failed' }, []);
  fail.menu.open('u2');
  await fail.menu.root.children[0].emit('submit', { preventDefault: () => {} });
  assert.equal(fail.menu.root.children[1].textContent, REPORT_FAIL);
});
