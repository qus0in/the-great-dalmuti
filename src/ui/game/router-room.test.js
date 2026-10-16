import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { call, startTestApp } from './test-app.js';

const createRoom = (app, userId = 'u0') =>
  call(app.baseUrl, '/api/rooms', { method: 'POST', userId });

const joinRoom = (app, userId) =>
  call(app.baseUrl, '/api/rooms/ROOM01/join', { method: 'POST', userId });

const startRoom = (app, userId = 'u0') =>
  call(app.baseUrl, '/api/rooms/ROOM01/start', { method: 'POST', userId });

describe('Game router room create and start', () => {
  it('Given host, When POST /api/rooms, Then 201 waiting room', async () => {
    const app = await startTestApp();
    try {
      const res = await createRoom(app);
      assert.equal(res.status, 201);
      assert.equal(res.body.game.joinCode, 'ROOM01');
      assert.equal(res.body.publicState.phase, 'waiting');
      assert.equal(res.body.seats.length, 4);
    } finally {
      await app.close();
    }
  });

  it('Given start by host, When POST start, Then 200 playing', async () => {
    const app = await startTestApp();
    try {
      await createRoom(app);
      const res = await startRoom(app);
      assert.equal(res.status, 200);
      assert.equal(res.body.game.phase, 'playing');
      assert.equal(res.body.publicState.seatSummary.length, 4);
    } finally {
      await app.close();
    }
  });
});

describe('Game router room errors', () => {
  it('Given 4 seated, When 5th user joins, Then 409 ROOM_FULL problem', async () => {
    const app = await startTestApp();
    try {
      await createRoom(app);
      for (const id of ['u1', 'u2', 'u3']) await joinRoom(app, id);
      const res = await joinRoom(app, 'u4');
      assert.equal(res.status, 409);
      assert.match(res.contentType, /problem\+json/);
      assert.equal(res.body.code, 'ROOM_FULL');
    } finally {
      await app.close();
    }
  });

  it('Given no credentials, When GET room, Then 401 problem', async () => {
    const app = await startTestApp();
    try {
      const res = await call(app.baseUrl, '/api/rooms/ROOM01');
      assert.equal(res.status, 401);
      assert.match(res.contentType, /problem\+json/);
      assert.equal(res.body.status, 401);
    } finally {
      await app.close();
    }
  });
});
