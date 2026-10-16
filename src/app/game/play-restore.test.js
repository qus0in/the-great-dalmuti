import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';
import { joinRoom } from './room-join.js';
import { startGame } from './room-start.js';
import { passTurn } from './play-actions.js';

const CLOCK = { now: () => new Date('2026-10-16T12:00:00Z') };

async function playingGame() {
  const gameRepository = createInMemoryGameRepository();
  const { game } = await createRoom(
    { gameRepository, clock: CLOCK },
    { hostUser: { id: 'u0', name: '방장' } },
  );
  for (const id of ['u1', 'u2', 'u3']) {
    await joinRoom(
      { gameRepository, clock: CLOCK },
      { joinCode: game.joinCode, user: { id } },
    );
  }
  const started = await startGame(
    { gameRepository, clock: CLOCK, rng: { random: () => 0.5 } },
    { joinCode: game.joinCode, user: { id: 'u0' } },
  );
  return { gameRepository, game: started.game, hands: started.hands };
}

const pairsByRank = (hand) => {
  const byRank = new Map();
  for (const card of hand) {
    if (!byRank.has(card.rank)) byRank.set(card.rank, []);
    byRank.get(card.rank).push(card);
  }
  return [...byRank.entries()]
    .filter(([, cards]) => cards.length >= 2)
    .map(([rank, cards]) => [rank, cards.slice(0, 2)]);
};

// 결함 재현 상태: 1번이 리드 페어(약한 랭크), 2번이 더 강한 페어로 따라 내며 아웃.
// 다음 차례는 3번. "현재 장수"에서 재생하면 2번의 저장된 플레이가 PLAYER_OUT.
async function seedOutSeatState(repo, game, hands) {
  const [rank1, pair1] = pairsByRank(hands[1]).sort((a, b) => b[0] - a[0])[0];
  const [, pair2] = pairsByRank(hands[2])
    .sort((a, b) => a[0] - b[0])
    .find(([rank]) => rank < rank1);
  const next = {
    ...hands,
    1: hands[1].filter((c) => !pair1.includes(c)),
    2: [],
  };
  await repo.saveHands(game.id, next);
  await repo.saveTrick(game.id, {
    id: 'trick-1',
    gameId: game.id,
    seq: 1,
    leaderSeat: 1,
    passes: 0,
    winnerSeat: null,
    plays: [
      { turnNo: 1, seat: 1, action: 'play', cards: pair1 },
      { turnNo: 2, seat: 2, action: 'play', cards: pair2 },
    ],
  });
}

describe('Trick restore after a seat is out', () => {
  it('Given emptied seat mid-trick, When next player passes, Then turn and counts are correct', async () => {
    const { gameRepository, game, hands } = await playingGame();
    await seedOutSeatState(gameRepository, game, hands);

    const result = await passTurn(
      { gameRepository, clock: CLOCK },
      { code: game.joinCode, user: { id: 'u3' }, version: game.version },
    );

    assert.equal(result.trickEnded, false);
    assert.equal(result.publicState.currentTurnSeat, 0);
    const seat1 = result.publicState.seatSummary.find((s) => s.seat === 1);
    assert.equal(seat1.cardCount, 18);
    const latest = await gameRepository.findLatestTrick(game.id);
    assert.equal(latest.passes, 1);
  });
});
