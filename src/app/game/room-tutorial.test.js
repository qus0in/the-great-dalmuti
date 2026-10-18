import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';
import { joinRoom } from './room-join.js';
import { startGame } from './room-start.js';

async function tutorialRoom() {
  const gameRepository = createInMemoryGameRepository();
  const deps = { gameRepository, rng: { random: () => 0.5 } };
  const hostUser = { id: 'host' };
  const created = await createRoom(deps, { hostUser, mode: 'tutorial' });
  return { deps, hostUser, created };
}

it('Given tutorial mode, When created and started, Then only host and three bots play', async () => {
  const { deps, hostUser, created } = await tutorialRoom();
  const { joinCode } = created.game;
  assert.equal(created.game.mode, 'tutorial');
  assert.equal(created.publicState.mode, 'tutorial');
  await assert.rejects(joinRoom(deps, { joinCode, user: { id: 'guest' } }), {
    code: 'TUTORIAL_ONLY_HOST',
  });
  const rejoined = await joinRoom(deps, { joinCode, user: hostUser });
  assert.equal(rejoined.seat, 0);
  const started = await startGame(deps, { joinCode, user: hostUser });
  assert.equal(started.publicState.mode, 'tutorial');
  assert.equal(started.game.mode, 'tutorial');
  assert.equal(started.seats.filter((s) => s.isBot).length, 3);
  assert.deepEqual(
    started.seats.filter((s) => !s.isBot).map((s) => s.userId),
    ['host'],
  );
  assert.ok(Object.values(started.hands).every((hand) => hand.length === 20));
  assert.equal(
    started.publicState.seatSummary.filter((s) => s.isBot).length,
    3,
  );
  assert.deepEqual(
    started.publicState.seatSummary.map((seat) => seat.userId),
    ['host', null, null, null],
  );
});

it('Given omitted mode, When guest joins and host starts, Then normal multiplayer remains', async () => {
  const gameRepository = createInMemoryGameRepository();
  const deps = { gameRepository, rng: { random: () => 0.5 } };
  const hostUser = { id: 'host' };
  const created = await createRoom(deps, { hostUser });
  assert.equal(created.game.mode, 'normal');
  assert.equal(created.publicState.mode, 'normal');
  const { joinCode } = created.game;
  await joinRoom(deps, { joinCode, user: { id: 'guest' } });
  const started = await startGame(deps, { joinCode, user: hostUser });
  assert.equal(started.seats.filter((s) => s.isBot).length, 2);
  assert.equal(started.publicState.mode, 'normal');
});
