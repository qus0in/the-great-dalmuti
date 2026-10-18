import { it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLobbyState,
  renderWaitingRoom,
  startLobbyRoom,
} from './public/js/play-lobby.js';

const room = (phase = 'waiting') => ({ publicState: { phase } });
const publicState = {
  phase: 'waiting',
  seatSummary: [
    { seat: 0, userId: 'u1', userName: '민우', isBot: false },
    { seat: 1, userId: null, userName: null, isBot: false },
  ],
};
const host = createLobbyState({
  code: 'ROOM01',
  publicState,
  mySeat: 0,
  origin: 'https://game.test/',
});
const guest = createLobbyState({
  code: 'ROOM01',
  publicState,
  mySeat: 1,
  origin: 'https://game.test',
});

it('maps seat details and builds the invite link', () => {
  assert.equal(host.link, 'https://game.test/play?code=ROOM01');
  assert.equal(host.seats.length, 2);
  assert.equal(host.seats[0].userName, '민우');
});

it('allows only the host to start while the room is waiting', () => {
  const started = createLobbyState({
    code: 'ROOM01',
    publicState: { ...publicState, phase: 'playing' },
    mySeat: 0,
  });
  assert.equal(host.isHost, true);
  assert.equal(host.canStart, true);
  assert.equal(guest.isHost, false);
  assert.equal(guest.canStart, false);
  assert.equal(started.canStart, false);
});

it('starts by code then reloads the game room', async () => {
  const calls = [];
  const api = {
    startGame: (code) => {
      calls.push(`start:${code}`);
      return Promise.resolve();
    },
    getRoom: (code) => {
      calls.push(`get:${code}`);
      return Promise.resolve(room('playing'));
    },
  };
  const result = await startLobbyRoom(api, 'ROOM01');
  assert.deepEqual(calls, ['start:ROOM01', 'get:ROOM01']);
  assert.equal(result.publicState.phase, 'playing');
});

it('hides the lobby and restores game surfaces after the room starts', () => {
  const selectors = [
    '.play-arena',
    '.play-hand-area',
    '[data-play="banner"]',
    '[data-play="substitution"]',
    '[data-play="lobby"]',
  ];
  const elements = new Map(
    selectors.map((selector) => [selector, { hidden: true }]),
  );
  const doc = { querySelector: (selector) => elements.get(selector) };
  renderWaitingRoom(
    doc,
    { code: 'ROOM01', publicState: { phase: 'playing' } },
    { mySeat: 0, origin: 'https://game.test' },
  );
  assert.equal(elements.get('.play-arena').hidden, false);
  assert.equal(elements.get('.play-hand-area').hidden, false);
  assert.equal(elements.get('[data-play="lobby"]').hidden, true);
});
