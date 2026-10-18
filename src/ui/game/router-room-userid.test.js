import { it } from 'node:test';
import assert from 'node:assert/strict';
import { call, startTestApp } from './test-app.js';

it('Given seated users, When GET room, Then exposes only their seat userIds', async () => {
  const app = await startTestApp();
  try {
    await call(app.baseUrl, '/api/rooms', { method: 'POST', userId: 'u0' });
    await call(app.baseUrl, '/api/rooms/ROOM01/join', {
      method: 'POST',
      userId: 'u1',
    });
    const room = await call(app.baseUrl, '/api/rooms/ROOM01', { userId: 'u1' });

    assert.equal(room.status, 200);
    assert.deepEqual(
      room.body.publicState.seatSummary.map((seat) => seat.userId),
      ['u0', 'u1'],
    );
    assert.deepEqual(Object.keys(room.body.publicState.seatSummary[0]).sort(), [
      'cardCount',
      'isBot',
      'seat',
      'userId',
      'userName',
    ]);
  } finally {
    await app.close();
  }
});
