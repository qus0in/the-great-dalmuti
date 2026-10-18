import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createChat } from './public/js/chat.js';

function fakeClient() {
  const calls = [];
  let receive;
  const channel = {
    on: (_event, _filter, callback) => {
      receive = callback;
      return channel;
    },
    subscribe: () => channel,
  };
  return {
    calls,
    channelRef: channel,
    channel: () => channel,
    receive: (payload) => receive({ payload }),
    removeChannel: (target) => calls.push(['removeChannel', target]),
  };
}

it('Given broadcasts, When received and closed, Then validates, marks mine and cleans up', async () => {
  const client = fakeClient();
  const messages = [];
  const chat = createChat(client, {
    gameId: 'g1',
    me: { userId: 'u1', name: '민우' },
    onMessage: (message) => messages.push(message),
  });
  const at = '2026-10-18T10:00:00.000Z';
  client.receive({ userId: 'u1', name: '민우', text: 'x'.repeat(205), at });
  client.receive({
    userId: 'u2',
    name: '영희',
    text: 'ok',
    at: '2026-10-18T10:00:00Z',
  });
  client.receive({ userId: 'u2', name: null, text: 'bad', at });
  client.receive({ userId: 'u2', name: '영희', text: 'bad', at: 'yesterday' });
  assert.equal(messages.length, 2);
  assert.equal(messages[0].text.length, 200);
  assert.equal(messages[0].mine, true);
  assert.equal(messages[1].mine, false);
  await chat.close();
  client.receive({ userId: 'u1', name: '민우', text: 'late', at });
  assert.equal(messages.length, 2);
  assert.deepEqual(client.calls[0], ['removeChannel', client.channelRef]);
  assert.deepEqual(await chat.send('closed'), { ok: false, reason: 'closed' });
});
