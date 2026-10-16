import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';
import { createRoom } from './room-create.js';
import { joinRoom } from './room-join.js';
import { startGame } from './room-start.js';

export const CLOCK = { now: () => new Date('2026-10-16T12:00:00Z') };

// 종료(finished) 상태의 판을 만든다. botSeats의 좌석은 봇으로 바꾼다.
// repository를 넘기면 같은 저장소에 추가 판을 만든다(전적 누적 검증용).
export async function finishedGame({ repository, botSeats = [] } = {}) {
  const gameRepository = repository ?? createInMemoryGameRepository();
  const deps = { gameRepository, clock: CLOCK };
  const { game } = await createRoom(deps, {
    hostUser: { id: 'u0', name: '방장' },
  });
  for (const id of ['u1', 'u2', 'u3']) {
    await joinRoom(deps, { joinCode: game.joinCode, user: { id } });
  }
  const started = await startGame(
    { ...deps, rng: { random: () => 0.5 } },
    { joinCode: game.joinCode, user: { id: 'u0' } },
  );
  const agg = await gameRepository.findGameByCode(game.joinCode);
  const seats = agg.seats.map((s) => ({ ...s }));
  for (const seat of botSeats) {
    seats[seat].userId = null;
    seats[seat].isBot = true;
  }
  await gameRepository.saveSeats(started.game.id, seats);
  await gameRepository.saveGameAndPublic({
    game: { ...started.game, phase: 'finished' },
    publicState: { ...agg.publicState, phase: 'finished' },
    expectedVersion: started.game.version,
  });
  const rankings = seats.map((s) => ({ playerId: s.seat, rank: s.seat + 1 }));
  return { gameRepository, game: started.game, rankings };
}
