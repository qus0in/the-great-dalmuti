import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { call, startTestApp } from './test-app.js';

async function createAndStart(app) {
  await call(app.baseUrl, '/api/rooms', { method: 'POST', userId: 'u0' });
  for (const id of ['u1', 'u2', 'u3']) {
    await call(app.baseUrl, '/api/rooms/ROOM01/join', {
      method: 'POST',
      userId: id,
    });
  }
  return call(app.baseUrl, '/api/rooms/ROOM01/start', {
    method: 'POST',
    userId: 'u0',
  });
}

describe('Game router body validation', () => {
  it('Given invalid plays body, When POST plays, Then 400 problem', async () => {
    const app = await startTestApp();
    try {
      await call(app.baseUrl, '/api/rooms', { method: 'POST', userId: 'u0' });
      const res = await call(app.baseUrl, '/api/rooms/ROOM01/plays', {
        method: 'POST',
        userId: 'u0',
        body: { version: 'stale', cards: [] },
      });
      assert.equal(res.status, 400);
      assert.match(res.contentType, /problem\+json/);
      assert.equal(res.body.status, 400);
    } finally {
      await app.close();
    }
  });
});

describe('Game router JSON parse errors', () => {
  it('Given broken JSON, When POST plays, Then 400 problem', async () => {
    const app = await startTestApp();
    try {
      const res = await call(app.baseUrl, '/api/rooms/ROOM01/plays', {
        method: 'POST',
        userId: 'u0',
        raw: '{broken',
      });
      assert.equal(res.status, 400);
      assert.match(res.contentType, /problem\+json/);
      assert.equal(res.body.status, 400);
    } finally {
      await app.close();
    }
  });
});

describe('Game router action and hand privacy', () => {
  it('Given started game, When host plays, Then 200 and no other hand', async () => {
    const app = await startTestApp();
    try {
      const started = await createAndStart(app);
      const agg = await app.repository.findGameByCode('ROOM01');
      const hands = await app.repository.findHands(agg.game.id);
      const cardId = hands[0][0].id;

      const play = await call(app.baseUrl, '/api/rooms/ROOM01/plays', {
        method: 'POST',
        userId: 'u0',
        body: { version: started.body.game.version, cards: [cardId] },
      });
      assert.equal(play.status, 200);

      const room = await call(app.baseUrl, '/api/rooms/ROOM01', {
        userId: 'u0',
      });
      assert.equal(room.status, 200);
      assert.equal(room.body.hand.length, 19);
      const text = JSON.stringify(room.body);
      for (const card of hands[1]) {
        assert.equal(text.includes(card.id), false);
      }
    } finally {
      await app.close();
    }
  });
});
