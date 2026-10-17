import { it } from 'node:test';
import assert from 'node:assert/strict';

import { createCard } from './cards.js';
import { assertPlayable } from './play.js';
import { suggestPlay } from './hint.js';

const card = (rank, index) => createCard(rank, index);
const selected = (hand, ids) => hand.filter((item) => ids.includes(item.id));

function assertValid(result, hand, lastPlay) {
  assert.equal(result.action, 'play');
  assert.doesNotThrow(() =>
    assertPlayable(lastPlay, selected(hand, result.cards)),
  );
}

it('Given a weak lead and strong cards, When suggesting, Then preserves strength', () => {
  const weak = [card(12, 1), card(12, 2)];
  const hand = [...weak, card(3, 1), card(1, 1), card(13, 1)];
  const result = suggestPlay({ hand, isLeader: true });

  assert.deepEqual(
    result.cards,
    weak.map((item) => item.id),
  );
  assert.match(result.reason, /가장 약한 12 농노 2장부터 털어/);
  assert.match(result.reason, /더 강한 카드는 선을 되찾을 때/);
  assertValid(result, hand, null);
});

it('Given only strong groups, When leading, Then uses the weakest remaining group', () => {
  const hand = [card(1, 1), card(3, 1)];
  const result = suggestPlay({ hand, isLeader: true });

  assert.deepEqual(result.cards, ['rank-3-1']);
  assert.match(result.reason, /가장 약한 3 시종장 1장부터 털어/);
  assertValid(result, hand, null);
});

it('Given several winning pairs, When following, Then saves stronger cards', () => {
  const hand = [
    card(8, 1),
    card(8, 2),
    card(5, 1),
    card(5, 2),
    card(2, 1),
    card(13, 1),
  ];
  const lastPlay = { rank: 10, count: 2 };
  const result = suggestPlay({ hand, lastPlay, isLeader: false });

  assert.deepEqual(result.cards, ['rank-8-1', 'rank-8-2']);
  assert.match(result.reason, /가장 약한 8 석공 2장을 내세요/);
  assert.match(result.reason, /더 강한 카드는 아껴 두세요/);
  assertValid(result, hand, lastPlay);
});

it('Given no winning group, When following, Then mixes a jester as a last resort', () => {
  const hand = [card(8, 1), card(13, 1), card(11, 1)];
  const lastPlay = { rank: 10, count: 2 };
  const result = suggestPlay({ hand, lastPlay, isLeader: false });

  assert.deepEqual(result.cards, ['rank-8-1', 'jester-1']);
  assert.match(result.reason, /일반 조합으로 이길 수 없어.*어릿광대/);
  assertValid(result, hand, lastPlay);
});

it('Given no matching group, When following, Then passes', () => {
  const hand = [card(8, 1), card(10, 1)];
  const result = suggestPlay({ hand, lastPlay: { rank: 4, count: 2 } });

  assert.equal(result.action, 'pass');
  assert.deepEqual(result.cards, []);
  assert.match(result.reason, /패스해야 해요/);
});

it('Given a regular response and a jester, When following, Then saves the jester', () => {
  const hand = [card(8, 1), card(13, 1)];
  const lastPlay = { rank: 10, count: 1 };
  const result = suggestPlay({ hand, lastPlay });

  assert.deepEqual(result.cards, ['rank-8-1']);
  assert.doesNotMatch(result.reason, /어릿광대/);
  assertValid(result, hand, lastPlay);
});

it('Given a revolution, When following, Then keeps card strength rule-valid', () => {
  const hand = [card(3, 1), card(7, 1)];
  const lastPlay = { rank: 9, count: 1 };
  const result = suggestPlay({ hand, lastPlay, revolution: true });

  assert.deepEqual(result.cards, ['rank-7-1']);
  assert.match(result.reason, /혁명 중에도 카드 강약은 같아요/);
  assertValid(result, hand, lastPlay);
});
