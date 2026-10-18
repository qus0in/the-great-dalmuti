import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mountChatPanel, REASONS } from './public/js/chat-panel.js';
function node(_tag = 'div') {
  const listeners = {};
  const el = {
    className: '',
    textContent: '',
    hidden: false,
    value: '',
    children: [],
    attrs: {},
    setAttribute: (k, v) => (el.attrs[k] = v),
    appendChild: (c) => el.children.push(c),
    append: (...cs) => el.children.push(...cs),
    addEventListener: (t, fn) => (listeners[t] ??= []).push(fn),
    emit: (t, ev = {}) => (listeners[t] ?? []).forEach((fn) => fn(ev)),
  };
  return el;
}
function docOf() {
  return {
    createElement: (t) => node(t),
    body: { appendChild: () => {} },
  };
}
function chatOf(impl) {
  return {
    send: () => Promise.resolve({ ok: true }),
    close: () => {},
    ...impl,
  };
}
it('메시지 추가와 XSS 안전(textContent만)', () => {
  const doc = docOf();
  const panel = mountChatPanel(doc, {
    chat: chatOf(),
    avatarFor: (m) => ({ name: m.name }),
  });
  const evil = '<img src=x onerror=alert(1)>';
  panel.addMessage({ userId: 'u1', name: '민우', text: evil });
  const list = panel.root.children[1].children[0];
  assert.equal(list.children.length, 1);
  const item = list.children[0];
  const text = item.children[item.children.length - 1];
  assert.equal(text.textContent, evil);
  assert.equal(item.innerHTML, undefined);
  assert.equal(item.children[0].className, 'avatar avatar--sm');
});
it('닫힘 안 읽음 증가·열면 0, 입력 maxlength 200', () => {
  const doc = docOf();
  const panel = mountChatPanel(doc, { chat: chatOf() });
  const ui = panel.root;
  const openBtn = ui.children[0];
  const badge = openBtn.children[0];
  const body = ui.children[1];
  assert.equal(badge.hidden, true);
  panel.addMessage({ userId: 'u1', name: 'A', text: 'hi' });
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, '1');
  panel.setOpen(true);
  assert.equal(badge.hidden, true);
  assert.equal(badge.textContent, '0');
  assert.equal(body.hidden, false);
  const input = body.children[2].children[0];
  assert.equal(input.attrs.maxlength, '200');
});
it('reason별 안내 문구', async () => {
  assert.equal(REASONS['too-long'], '200자까지 보낼 수 있어요.');
  assert.equal(REASONS['too-fast'], '조금 천천히 보내 주세요.');
  assert.equal(REASONS.blocked, '지금은 채팅을 보낼 수 없어요.');
  const doc = docOf();
  const chat = chatOf({
    send: () => Promise.resolve({ ok: false, reason: 'too-fast' }),
  });
  const panel = mountChatPanel(doc, { chat });
  const body = panel.root.children[1];
  const form = body.children[2];
  const input = form.children[0];
  const notice = body.children[1];
  input.value = 'hello';
  await form.emit('submit', { preventDefault: () => {} });
  await Promise.resolve();
  assert.equal(notice.textContent, REASONS['too-fast']);
  assert.equal(notice.hidden, false);
});
it('isTutorial이면 패널 숨김', () => {
  const doc = docOf();
  const panel = mountChatPanel(doc, { chat: chatOf(), isTutorial: true });
  assert.equal(panel.root.hidden, true);
  panel.addMessage({ userId: 'u1', name: 'A', text: 'hi' });
  assert.equal(panel.root.children[1].children[0].children.length, 0);
});
