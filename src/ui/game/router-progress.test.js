import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeTestCards,
  setupTributeFixture,
} from '../../app/game/tribute-test-fixture.js';
import { call } from './test-app.js';
import { fakeRuntime, startRuntimeApp } from './runtime-test-app.js';

describe('Runtime afterAction on tribute', () => {
  it('Given tribute, When submitted, Then runtime runs and response is latest', async () => {
    const { gameRepository, cards } = await setupTributeFixture();
    const runtime = fakeRuntime();
    const app = await startRuntimeApp({ runtime, repository: gameRepository });
    try {
      const res = await call(app.baseUrl, '/api/rooms/ROOM1/tribute', {
        method: 'POST',
        userId: 'u-gd',
        body: {
          version: 1,
          returns: {
            대달무티: [cards.gd[0], cards.gd[1]],
            소달무티: [cards.ld[0]],
          },
        },
      });
      assert.equal(res.status, 200);
      assert.deepEqual(runtime.calls, ['ROOM1']);
      assert.equal(res.body.publicState.progressed, true);
    } finally {
      await app.close();
    }
  });
});

describe('Runtime afterAction on revolution', () => {
  it('Given two jesters, When declared, Then runtime runs', async () => {
    const base = makeTestCards();
    const { gameRepository } = await setupTributeFixture({
      handsOverride: {
        0: [
          { id: 'jester-1', rank: 13 },
          { id: 'jester-2', rank: 13 },
        ],
        1: base.ld,
        2: base.lp,
        3: base.gp,
      },
    });
    const runtime = fakeRuntime();
    const app = await startRuntimeApp({ runtime, repository: gameRepository });
    try {
      const res = await call(app.baseUrl, '/api/rooms/ROOM1/revolution', {
        method: 'POST',
        userId: 'u-gd',
        body: { version: 1 },
      });
      assert.equal(res.status, 200);
      assert.deepEqual(runtime.calls, ['ROOM1']);
      assert.equal(res.body.publicState.progressed, true);
    } finally {
      await app.close();
    }
  });
});
