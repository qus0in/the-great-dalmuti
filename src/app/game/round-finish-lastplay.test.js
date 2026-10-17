import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { persistAdvance } from './round-finish.js';

const LAST = { seat: 0, rank: 7, count: 1 };

function input() {
  return {
    game: { id: 'g1', phase: 'playing', version: 3, updatedAt: 'before' },
    publicState: {
      gameId: 'g1',
      phase: 'playing',
      version: 3,
      lastPlay: LAST,
      updatedAt: 'before',
    },
    nowIso: 'now',
  };
}

function fakeRepo() {
  const saved = [];
  return {
    saved,
    saveGameAndPublic: (params) => {
      saved.push(params);
    },
  };
}

describe('Advance persists public state', () => {
  it('Given new trick, When persistAdvance, Then lastPlay resets', async () => {
    const repo = fakeRepo();
    const out = await persistAdvance({
      ...input(),
      gameRepository: repo,
      roundEnded: false,
      turnSeat: 1,
    });
    assert.equal(out.publicState.lastPlay, null);
    assert.equal(out.publicState.currentTurnSeat, 1);
    assert.equal(repo.saved[0].publicState.lastPlay, null);
  });

  it('Given round end, When persistAdvance, Then lastPlay is kept', async () => {
    const repo = fakeRepo();
    const out = await persistAdvance({
      ...input(),
      gameRepository: repo,
      roundEnded: true,
      turnSeat: null,
    });
    assert.equal(out.publicState.phase, 'finished');
    assert.deepEqual(out.publicState.lastPlay, LAST);
  });
});
