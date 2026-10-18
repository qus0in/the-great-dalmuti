import { it } from 'node:test';
import assert from 'node:assert/strict';
import { connectRoomChat, rankingText } from './public/js/play-flow.js';
import { mountChatPanel } from './public/js/chat-panel.js';
import { docOf } from './report-fixture.js';

const SEATS = [
  { seat: 0, userName: '방장' },
  { seat: 1, userName: '봇 1' },
  { seat: 2, userName: '봇 2' },
  { seat: 3, userName: '봇 3' },
];

it('Given rankings and seat names, When rankingText, Then position, rank, name are shown', () => {
  const result = {
    publicState: { seatSummary: SEATS },
    rankings: [
      { playerId: 2, rank: '대달무티' },
      { playerId: '1', rank: '소달무티' },
      { playerId: 0, rank: '소농노' },
      { playerId: 3, rank: '대농노' },
    ],
  };
  assert.equal(
    rankingText(result),
    '라운드 종료 — 1위 대달무티 봇 2, 2위 소달무티 봇 1, 3위 소농노 방장, 4위 대농노 봇 3',
  );
});

it('Given no seat summary, When rankingText, Then falls back to seat number', () => {
  const result = { rankings: [{ playerId: '3', rank: '대농노' }] };
  assert.equal(rankingText(result), '라운드 종료 — 1위 대농노 좌석 3');
});

it('Given missing rankings, When rankingText, Then null', () => {
  assert.equal(rankingText({}), null);
  assert.equal(rankingText(null), null);
});

function roomChat(onReport) {
  const doc = docOf();
  let receive;
  const panel = connectRoomChat({
    doc,
    client: {
      storage: {
        from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }),
      },
    },
    user: { id: 'me' },
    me: 'me',
    room: {
      gameId: 'g1',
      publicState: { mode: 'multi', seatSummary: [{ userId: 'u2' }] },
    },
    seatPrivacy: { hiddenIdsFor: () => new Set() },
    onReport,
    // 0.3.7 스위치 true-path: 실제 mountChatPanel에 기능 플래그만 주입.
    mountChatPanelImpl: (doc, opts) =>
      mountChatPanel(doc, { ...opts, features: { moderationUi: true } }),
    createChatImpl: (_client, options) => {
      receive = options.onMessage;
      return { send: () => Promise.resolve({ ok: true }), close: () => {} };
    },
  });
  return { panel, receive };
}

it('일반 방 채팅 상대 메시지에 신고 버튼이 연결된다', () => {
  const seen = [];
  const { panel, receive } = roomChat((target) => seen.push(target));
  receive({ userId: 'u2', name: '상대', text: '안녕' });
  const item = panel.root.children[1].children[0].children[0];
  item.children[item.children.length - 1].emit('click');
  assert.deepEqual(seen, [{ targetId: 'u2', reason: 'chat' }]);
});

it('튜토리얼 방에서는 채팅을 마운트하지 않는다', () => {
  let created = false;
  assert.equal(
    connectRoomChat({
      isTutorial: true,
      room: { publicState: { mode: 'tutorial' } },
      createChatImpl: () => {
        created = true;
      },
    }),
    null,
  );
  assert.equal(created, false);
});
