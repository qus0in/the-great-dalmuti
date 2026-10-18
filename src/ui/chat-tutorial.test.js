import { it } from 'node:test';
import assert from 'node:assert/strict';
import { connectRoomChat, createStartedRoom } from './public/js/play-flow.js';

it('Given a tutorial room, When setup completes, Then chat is not connected', async () => {
  const options = [];
  const api = {
    createRoom: (mode) => {
      options.push(mode);
      return Promise.resolve({
        game: { joinCode: 'TUT' },
        seats: [{ userId: 'u1', seat: 2 }],
      });
    },
    startGame: () => Promise.resolve(),
    getRoom: () => Promise.resolve({ gameId: 'g1' }),
  };
  const room = await createStartedRoom(api, { id: 'u1' }, '?mode=tutorial');
  let called = false;
  assert.equal(
    connectRoomChat({
      isTutorial: room.isTutorial,
      createChatImpl: () => (called = true),
    }),
    null,
  );
  assert.deepEqual(options, [{ mode: 'tutorial' }]);
  assert.equal(called, false);
});
