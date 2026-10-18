import { it } from 'node:test';
import assert from 'node:assert/strict';
import { connectRoomChat } from './public/js/play-flow.js';

function avatarClient() {
  return {
    storage: {
      from: (bucket) => ({
        getPublicUrl: (path) => ({
          data: { publicUrl: `https://img.test/${bucket}/${path}` },
        }),
      }),
    },
  };
}

function chatHarness() {
  const messages = [];
  const exits = [];
  let receive;
  let mounted;
  const panel = {
    addMessage: (message) => messages.push(message),
    close: () => exits.push('closed'),
  };
  return {
    messages,
    exits,
    panel,
    client: avatarClient(),
    emit: (message) => receive(message),
    mounted: () => mounted,
    createChatImpl: (_client, options) => {
      receive = options.onMessage;
      receive({ text: 'early' });
      return { send() {}, close() {} };
    },
    mountChatPanelImpl: (_doc, options) => {
      mounted = options;
      return panel;
    },
  };
}

function connectRegularRoom(h) {
  connectRoomChat({
    client: h.client,
    user: { id: 'u1', user_metadata: { full_name: '민우' } },
    room: {
      gameId: 'g1',
      publicState: { seatSummary: [{ userId: 'u1' }, { userId: 'u2' }] },
    },
    isTutorial: false,
    doc: { defaultView: { addEventListener: (...args) => h.exits.push(args) } },
    seatPrivacy: { hiddenIdsFor: () => new Set(['u2']) },
    createChatImpl: h.createChatImpl,
    mountChatPanelImpl: h.mountChatPanelImpl,
  });
}

function assertRoomPanel(h) {
  assert.equal(h.mounted().isTutorial, false);
  assert.equal(
    h.mounted().avatarFor({ userId: 'u1', name: 'A' }).url,
    'https://img.test/avatars/u1/avatar',
  );
  assert.equal(h.mounted().avatarFor({ userId: 'u2', name: 'B' }).hidden, true);
  assert.equal(
    h.mounted().avatarFor({ userId: 'unknown', name: 'C' }).hidden,
    true,
  );
  assert.equal(h.exits[0][0], 'pagehide');
  h.exits[0][1]();
  assert.equal(h.exits[1], 'closed');
}

it('Given a regular room, When connected, Then mounts messages, avatars and exit cleanup', () => {
  const h = chatHarness();
  connectRegularRoom(h);
  h.emit({ text: 'later' });
  assert.deepEqual(h.messages, [{ text: 'early' }, { text: 'later' }]);
  assertRoomPanel(h);
});
