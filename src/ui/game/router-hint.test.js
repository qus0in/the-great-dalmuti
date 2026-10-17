import { it } from 'node:test';
import assert from 'node:assert/strict';
import { call, startTestApp } from './test-app.js';

const post = (app, path, body) =>
  call(app.baseUrl, `/api/rooms${path}`, {
    method: 'POST',
    userId: 'u0',
    body,
  });
const card = (id, rank) => ({ id, rank });
const row = (turnNo, seat, cards = []) => ({
  turnNo,
  seat,
  action: cards.length ? 'play' : 'pass',
  cards,
});
const previousTrick = (gameId) => ({
  id: 't1',
  gameId,
  seq: 1,
  leaderSeat: 1,
  winnerSeat: null,
  passes: 2,
  plays: [row(1, 1, [card('played', 2)]), row(2, 2), row(3, 3)],
});
const get = (app) => call(app.baseUrl, '/api/rooms/ROOM01', { userId: 'u0' });

async function setup(
  app,
  { mode = 'tutorial', follow = false, rank = 8 } = {},
) {
  await post(app, '', { mode });
  await post(app, '/ROOM01/start');
  const agg = await app.repository.findGameByCode('ROOM01');
  await app.repository.saveHands(agg.game.id, {
    0: [card('own', rank), card('own-extra', 12)],
    1: [card('secret-1', 6)],
    2: [card('secret-2', 7)],
    3: [card('secret-3', 9)],
  });
  if (follow)
    await app.repository.saveTrick(agg.game.id, previousTrick(agg.game.id));
  return agg;
}

for (const scenario of [
  { action: 'play', follow: false, rank: 8 },
  { action: 'play', follow: true, rank: 1 },
  { action: 'pass', follow: true, rank: 8 },
]) {
  it(`Given tutorial follow=${scenario.follow} rank=${scenario.rank}, When hint submitted, Then ${scenario.action} accepted privately`, async () => {
    const app = await startTestApp();
    try {
      await setup(app, scenario);
      const response = await get(app);
      assert.equal(response.status, 200);
      const { hint, publicState, hand } = response.body;
      assert.equal(hint.action, scenario.action);
      assert.match(hint.reason, /[가-힣]/);
      assert.ok(hint.cards.every((id) => hand.some((card) => card.id === id)));
      assert.ok(!JSON.stringify(response.body).includes('secret-'));
      const path = hint.action === 'play' ? 'plays' : 'pass';
      const submitted = await post(app, `/ROOM01/${path}`, {
        cards: hint.cards,
        version: publicState.version,
      });
      assert.equal(submitted.status, 200);
      if (hint.action === 'play')
        assert.equal((await get(app)).body.hint, null);
    } finally {
      await app.close();
    }
  });
}

for (const mode of ['normal', 'tutorial']) {
  it(`Given ${mode} room outside tutorial turn, When GET, Then hint null and outsiders denied`, async () => {
    const app = await startTestApp();
    try {
      await post(app, '', { mode });
      if (mode === 'normal') await post(app, '/ROOM01/start');
      assert.equal((await get(app)).body.hint, null);
      const denied = await call(app.baseUrl, '/api/rooms/ROOM01', {
        userId: 'outsider',
      });
      assert.equal(denied.status, 403);
    } finally {
      await app.close();
    }
  });
}
