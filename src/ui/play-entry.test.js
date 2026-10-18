import { it } from 'node:test';
import assert from 'node:assert/strict';
import { prepareRoom } from './public/js/play-lobby.js';

const user = { id: 'u1' };
const room = (phase = 'waiting', userId = 'u1', seat = 0) => ({
  publicState: {
    phase,
    seatSummary: [{ seat, userId, userName: '민우', isBot: false }],
  },
});

it('creates a waiting room and replaces the URL without starting', async () => {
  let starts = 0;
  let replaced;
  const api = {
    createRoom: () => ({
      game: { joinCode: 'ROOM01' },
      seats: [{ userId: 'u1', seat: 0 }],
    }),
    startGame: () => {
      starts += 1;
    },
    getRoom: () => room(),
  };
  const result = await prepareRoom(api, user, {
    search: '',
    replaceUrl: (url) => {
      replaced = url;
    },
  });
  assert.equal(result.room.publicState.phase, 'waiting');
  assert.equal(starts, 0);
  assert.equal(replaced, '/play?code=ROOM01');
});

it('joins a code room when the current user has no seat', async () => {
  const calls = [];
  const api = {
    getRoom: () => {
      calls.push('get');
      if (calls.length === 1) throw Object.assign(new Error(), { status: 403 });
      return room('waiting', 'u1', 2);
    },
    joinRoom: () => {
      calls.push('join');
      return { seat: 2 };
    },
  };
  const result = await prepareRoom(api, user, '?code=ROOM01');
  assert.deepEqual(calls, ['get', 'join', 'get']);
  assert.equal(result.seat, 2);
});

it('keeps an existing seat without joining again', async () => {
  let joins = 0;
  const result = await prepareRoom(
    {
      getRoom: () => room('waiting', 'u1', 3),
      joinRoom: () => {
        joins += 1;
      },
    },
    user,
    '?code=ROOM01',
  );
  assert.equal(result.seat, 3);
  assert.equal(joins, 0);
});

it('starts tutorial rooms immediately', async () => {
  let starts = 0;
  let replaced = false;
  const api = {
    createRoom: (options) => {
      assert.deepEqual(options, { mode: 'tutorial' });
      return {
        game: { joinCode: 'TUT01' },
        seats: [{ userId: 'u1', seat: 0 }],
      };
    },
    startGame: () => {
      starts += 1;
    },
    getRoom: () => room('playing'),
  };
  const result = await prepareRoom(api, user, {
    search: '?mode=tutorial',
    replaceUrl: () => {
      replaced = true;
    },
  });
  assert.equal(result.isTutorial, true);
  assert.equal(starts, 1);
  assert.equal(replaced, false);
});
