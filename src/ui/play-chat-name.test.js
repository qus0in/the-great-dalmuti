import { it } from 'node:test';
import assert from 'node:assert/strict';
import { connectRoomChat } from './public/js/play-flow.js';

function fakeChannel(state) {
  const channel = {
    on: (_event, _filter, handler) => {
      Object.assign(state, { receive: handler });
      return channel;
    },
    subscribe: () => channel,
    send: (message) => {
      state.sent.push(message);
      return Promise.resolve('ok');
    },
  };
  return channel;
}

function fakeClient(channel) {
  return {
    channel: () => channel,
    rpc: () => Promise.resolve({ data: false, error: null }),
  };
}

function roomOptions(state, client) {
  return {
    client,
    user: { id: 'u1' },
    room: {
      gameId: 'g1',
      publicState: {
        seatSummary: [
          { userId: 'u1', userName: '참가자' },
          { userId: 'u2', userName: '플레이어 1' },
        ],
      },
    },
    doc: {},
    seatPrivacy: { hiddenIdsFor: () => new Set() },
    mountChatPanelImpl: (_doc, options) => {
      Object.assign(state, { chat: options.chat });
      return {
        addMessage: (message) => state.messages.push(message),
        close() {},
      };
    },
  };
}

function connectRoom() {
  const state = { messages: [], sent: [] };
  connectRoomChat(roomOptions(state, fakeClient(fakeChannel(state))));
  return state;
}

it('이름 없는 계정의 채팅 송수신은 공개 좌석 이름을 쓴다', async () => {
  const state = connectRoom();
  await state.chat.send('안녕');
  assert.equal(state.sent[0].payload.name, '참가자');
  state.receive({
    payload: {
      userId: 'u2',
      name: '',
      text: '안녕',
      at: '2026-10-18T10:00:00.000Z',
    },
  });
  assert.equal(state.messages[0].name, '플레이어 1');
});
