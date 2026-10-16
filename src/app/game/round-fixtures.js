import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';
import { joinRoom } from './room-join.js';
import { startGame } from './room-start.js';

export const CLOCK = { now: () => new Date('2026-10-16T12:00:00Z') };

const playRow = (turnNo, seat, cards) => ({
  turnNo,
  seat,
  action: 'play',
  cards,
});
const passRow = (turnNo, seat) => ({ turnNo, seat, action: 'pass', cards: [] });

export const fourRows = (played) => [
  playRow(1, 0, [played]),
  passRow(2, 1),
  passRow(3, 2),
  passRow(4, 3),
];

// 4인이 시작한 진행 중 게임을 만든다 (고정 난수 분배)
export async function playingGame() {
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

// 종료된 트릭을 미리 저장해 U5 홀로 검증한다 (U4 경로 비의존)
export async function saveFinishedTrick(repo, game, { hands, plays }) {
  await repo.saveHands(game.id, hands);
  await repo.saveTrick(game.id, {
    id: 'trick-1',
    gameId: game.id,
    seq: 1,
    leaderSeat: 0,
    passes: 3,
    winnerSeat: 0,
    plays,
  });
}
