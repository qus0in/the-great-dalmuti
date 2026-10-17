import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayState } from './public/js/play-state.js';

it('Given a room hint, When stored, Then get returns an independent hint copy', () => {
  const state = createPlayState();
  const hint = { action: 'play', cards: ['c1'], reason: '낮은 카드를 내세요.' };
  state.setRoom({
    code: 'R1',
    publicState: { gameId: 'g1', phase: 'playing', version: 3 },
    hand: [{ id: 'c1' }],
    hint,
  });

  const result = state.get();
  assert.deepEqual(result.hint, hint);
  result.hint.cards.push('c2');
  assert.deepEqual(state.get().hint.cards, ['c1']);
});
