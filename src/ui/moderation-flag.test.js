// 0.3.7 기능 스위치 — false면 신고·이의제기 버튼 없음, true면 기존 동작.
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { MODERATION_UI } from './public/js/features.js';
import { renderSeats } from './public/js/play-dom-seats.js';
import { mountChatPanel } from './public/js/chat-panel.js';
import { createRoomReportContext } from './public/js/play-report.js';
import { docOf, pubOf } from './report-fixture.js';
import { createFixture } from './profile-appeal-fixture.js';

const ON = { moderationUi: true };
const seats = () => [
  { seat: 0, userName: '나', cardCount: 5, userId: 'me' },
  { seat: 2, userName: '민우', cardCount: 5, userId: 'u2' },
];
const reported = (row) =>
  row.children.find((c) => c.attrs['data-report'] === 'seat') || null;

it('스위치 한 곳: 기본값 false', () => {
  assert.equal(MODERATION_UI, false);
});

it('false: 좌석 신고 버튼 0개·컨텍스트 빈 객체', () => {
  const doc = docOf();
  renderSeats(doc, pubOf(seats()), { mySeat: 0, me: 'me', onReport: () => {} });
  assert.equal(reported(doc.slots[0].els.row), null);
  const ctx = createRoomReportContext(docOf(), {
    client: {},
    user: { id: 'me' },
    room: { publicState: { mode: 'multi' } },
  });
  assert.deepEqual(ctx, {});
});

it('false: 채팅 신고 버튼 없음', () => {
  const panel = mountChatPanel(docOf(), {
    chat: { send: () => Promise.resolve({ ok: true }), close: () => {} },
    me: 'me',
    onReport: () => {},
  });
  panel.addMessage({ userId: 'u2', name: '비', text: 'hi' });
  assert.equal(
    panel.root.children[1].children[0].children[0].children.length,
    3,
  );
});

it('false: 이의제기 버튼 없음(가려짐이어도 숨김)', async () => {
  const { card, els, appeal } = createFixture();
  card.features = {};
  await appeal.sync();
  assert.equal(els.root.hidden, true);
  assert.equal(els.btn.hidden, true);
  assert.equal(els.form.hidden, true);
});

it('true: 좌석·채팅 신고 버튼 기존 동작', () => {
  const seen = [];
  const doc = docOf();
  renderSeats(doc, pubOf(seats()), {
    mySeat: 0,
    me: 'me',
    features: ON,
    onReport: (t) => seen.push(t),
  });
  const btn = reported(doc.slots[0].els.row);
  assert.equal(btn.className, 'seat__report');
  btn.emit('click');
  assert.deepEqual(seen, [{ targetId: 'u2', reason: 'photo' }]);
  const panel = mountChatPanel(docOf(), {
    chat: { send: () => Promise.resolve({ ok: true }), close: () => {} },
    me: 'me',
    features: ON,
    onReport: () => {},
    avatarFor: (m) => ({ name: m.name }),
  });
  panel.addMessage({ userId: 'u2', name: '비', text: 'hi' });
  const item = panel.root.children[1].children[0].children[0];
  assert.equal(
    item.children[item.children.length - 1].className,
    'chat-panel__report',
  );
});
