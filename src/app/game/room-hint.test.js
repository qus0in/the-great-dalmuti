import { it } from 'node:test';
import assert from 'node:assert/strict';
import { getRoomHint } from './room-hint.js';

function fixture() {
  const input = {
    game: { id: 'g1', mode: 'tutorial', phase: 'playing' },
    publicState: { currentTurnSeat: 0, revolution: { isRevolution: true } },
    seat: 0,
    hands: {
      0: [{ id: 'own-8', rank: 8 }],
      1: [{ id: 'secret-1', rank: 1 }],
      2: [{ id: 'secret-2', rank: 2 }],
      3: [{ id: 'secret-3', rank: 3 }],
    },
  };
  const gameRepository = {
    findCurrentTrick: () => Promise.resolve(null),
    findLatestTrick: () => Promise.resolve(null),
  };
  return { deps: { gameRepository }, input };
}

it('Given tutorial turn and revolution, When hint requested, Then only own cards and Korean reason appear', async () => {
  const { deps, input } = fixture();
  const before = JSON.stringify(input);
  const hint = await getRoomHint(deps, input);
  assert.equal(hint.action, 'play');
  assert.deepEqual(hint.cards, ['own-8']);
  assert.match(hint.reason, /혁명/);
  assert.match(hint.reason, /[가-힣]/);
  assert.ok(!JSON.stringify(hint).includes('secret'));
  assert.equal(JSON.stringify(input), before);
});

const excluded = [
  ['normal room', { game: { mode: 'normal' } }],
  ['other turn', { publicState: { currentTurnSeat: 1 } }],
  ['waiting phase', { game: { phase: 'waiting' } }],
  ['finished phase', { game: { phase: 'finished' } }],
  ['empty hand', { hands: { 0: [] } }],
  ['missing hands', { hands: null }],
];
for (const [name, overrides] of excluded) {
  it(`Given ${name}, When hint requested, Then null without trick query`, async () => {
    const { deps, input } = fixture();
    const merged = {
      ...input,
      ...overrides,
      game: { ...input.game, ...overrides.game },
      publicState: { ...input.publicState, ...overrides.publicState },
    };
    deps.gameRepository.findCurrentTrick = () => assert.fail('no trick read');
    assert.equal(await getRoomHint(deps, merged), null);
  });
}

it('Given new trick with stale public lastPlay, When hint requested, Then leader can play own group', async () => {
  const { deps, input } = fixture();
  input.publicState.lastPlay = { seat: 1, rank: 1, count: 2 };
  const hint = await getRoomHint(deps, input);
  assert.equal(hint.action, 'play');
  assert.deepEqual(hint.cards, ['own-8']);
});
