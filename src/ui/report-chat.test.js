// 계약 1·2 — 채팅 진입점: 상대 메시지에만 '신고' 버튼.
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { mountChatPanel } from './public/js/chat-panel.js';
import { docOf } from './report-fixture.js';
function chatOf() {
  return { send: () => Promise.resolve({ ok: true }), close: () => {} };
}
function itemOf(panel, index) {
  return panel.root.children[1].children[0].children[index];
}
it('상대 메시지: 신고 버튼·클릭 전달(reason chat)', () => {
  const seen = [];
  const panel = mountChatPanel(docOf(), {
    chat: chatOf(),
    me: 'me',
    features: { moderationUi: true },
    onReport: (target) => seen.push(target),
    avatarFor: (msg) => ({ name: msg.name }),
  });
  panel.addMessage({ userId: 'u2', name: '비', text: 'hello' });
  const item = itemOf(panel, 0);
  const btn = item.children[item.children.length - 1];
  assert.equal(btn.className, 'chat-panel__report');
  assert.equal(btn.textContent, '신고');
  btn.emit('click');
  assert.deepEqual(seen, [{ targetId: 'u2', reason: 'chat' }]);
});
it('본인·봇 메시지: 버튼 없음', () => {
  const panel = mountChatPanel(docOf(), {
    chat: chatOf(),
    me: 'me',
    onReport: () => {},
  });
  panel.addMessage({ userId: 'me', name: '나', text: 'hi', mine: true });
  panel.addMessage({ userId: 'b1', name: '봇', text: 'hi', isBot: true });
  assert.equal(itemOf(panel, 0).children.length, 3);
  assert.equal(itemOf(panel, 1).children.length, 3);
});
it('me·onReport 없으면 버튼 없음', () => {
  const panel = mountChatPanel(docOf(), { chat: chatOf() });
  panel.addMessage({ userId: 'u2', name: '비', text: 'hi' });
  assert.equal(itemOf(panel, 0).children.length, 3);
});
