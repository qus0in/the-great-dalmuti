import { it } from 'node:test';
import assert from 'node:assert/strict';
import { subscribeGame } from './public/js/realtime.js';

function fakeClient() {
  const calls = [];
  const channel = {
    on: (event, config, callback) => {
      calls.push(['on', event, config, callback]);
      return channel;
    },
    subscribe: () => {
      calls.push(['subscribe']);
      return channel;
    },
  };
  return {
    calls,
    channelRef: channel,
    channel: (name) => {
      calls.push(['channel', name]);
      return channel;
    },
    removeChannel: (target) => {
      calls.push(['removeChannel', target]);
    },
  };
}

it('Given client, When subscribeGame, Then filters game_public and unsubscribes', () => {
  const client = fakeClient();
  const changes = [];
  const unsubscribe = subscribeGame(client, 'g1', (payload) => {
    changes.push(payload);
  });

  assert.deepEqual(client.calls[0], ['channel', 'game-public:g1']);
  assert.deepEqual(client.calls[1].slice(0, 3), [
    'on',
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'game_public',
      filter: 'game_id=eq.g1',
    },
  ]);
  assert.deepEqual(client.calls[2], ['subscribe']);

  const payload = { eventType: 'UPDATE', new: { version: 2 } };
  client.calls[1][3](payload);
  assert.deepEqual(changes, [payload]);

  unsubscribe();
  assert.deepEqual(client.calls[3], ['removeChannel', client.channelRef]);
});
