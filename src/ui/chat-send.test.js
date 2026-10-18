import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createChat } from './public/js/chat.js';

function fakeClient(blocked = false) {
  const calls = [];
  const channel = {
    on: (event, filter) => {
      calls.push(['on', event, filter]);
      return channel;
    },
    subscribe: () => {
      calls.push(['subscribe']);
      return channel;
    },
    send: (message) => {
      calls.push(['send', message]);
      return Promise.resolve('ok');
    },
  };
  return {
    calls,
    channel: (name, options) => {
      calls.push(['channel', name, options]);
      return channel;
    },
    rpc: (name, args) => {
      calls.push(['rpc', name, args]);
      return Promise.resolve({ data: blocked, error: null });
    },
    removeChannel: (target) => calls.push(['removeChannel', target]),
  };
}

const ME = { userId: 'u1', name: '민우' };

it('Given chat text, When sent, Then validates length and one-second spacing', async () => {
  const realNow = Date.now;
  let now = 5000;
  Date.now = () => now;
  try {
    const client = fakeClient();
    const chat = createChat(client, { gameId: 'g1', me: ME });
    assert.deepEqual(client.calls.slice(0, 3), [
      ['channel', 'game-chat:g1', { config: { broadcast: { self: true } } }],
      ['on', 'broadcast', { event: 'chat' }],
      ['subscribe'],
    ]);
    assert.deepEqual(await chat.send('   '), { ok: false, reason: 'empty' });
    assert.deepEqual(await chat.send('a'.repeat(200)), { ok: true });
    assert.deepEqual(await chat.send('b'), { ok: false, reason: 'too-fast' });
    now += 1000;
    assert.deepEqual(await chat.send('a'.repeat(201)), {
      ok: false,
      reason: 'too-long',
    });
    assert.deepEqual(await chat.send('b'), { ok: true });
    const sent = client.calls.filter(([kind]) => kind === 'send');
    assert.equal(sent[0][1].payload.text.length, 200);
    assert.equal(sent[1][1].payload.text, 'b');
  } finally {
    Date.now = realNow;
  }
});

it('Given a blocked user, When sending, Then calls moderation with target_user_id', async () => {
  const client = fakeClient(true);
  const chat = createChat(client, { gameId: 'g1', me: ME });
  assert.deepEqual(await chat.send('안녕'), { ok: false, reason: 'blocked' });
  assert.deepEqual(client.calls.find(([kind]) => kind === 'rpc').slice(1), [
    'is_chat_blocked',
    { target_user_id: 'u1' },
  ]);
  assert.equal(
    client.calls.some(([kind]) => kind === 'send'),
    false,
  );
});
