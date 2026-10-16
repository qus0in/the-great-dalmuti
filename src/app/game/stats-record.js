import { ConflictError, NotFoundError } from './room-errors.js';

const DEFAULT_CLOCK = { now: () => new Date() };

// 모드 분류: 카운트다운 종료 시점 사람 수 (ADR-0004 확정 3, 봇 좌석 제외)
function modeOf(seats) {
  const humans = seats.filter((s) => !s.isBot && s.userId !== null).length;
  return humans === 1 ? 'single' : 'multi';
}

// 판 종료 시 참가자별 결과 행 저장 (봇 좌석·봇 대행 사용자는 제외 — ADR-0004 확정 4)
// substitutedUserIds: 봇 대행을 한 번이라도 쓴 사용자 (U7·U8 이전이라 인자 경계로 받음)
export async function recordGameResults(
  { gameRepository, clock = DEFAULT_CLOCK },
  { gameId, rankings, substitutedUserIds = [] },
) {
  const agg = await gameRepository.findGameById(gameId);
  if (!agg) throw new NotFoundError('Game not found', 'ROOM_NOT_FOUND');
  if (agg.game.phase !== 'finished') {
    throw new ConflictError('Game not finished', 'CONFLICT');
  }
  const mode = modeOf(agg.seats);
  const substituted = new Set(substitutedUserIds);
  const playedAt = clock.now().toISOString();
  const rows = [];
  for (const { playerId, rank } of rankings ?? []) {
    const seat = agg.seats.find((s) => s.seat === Number(playerId));
    if (!seat || !seat.userId) continue;
    if (substituted.has(seat.userId)) continue;
    rows.push({ gameId, userId: seat.userId, mode, rank, playedAt });
  }
  await gameRepository.saveResults(gameId, rows);
  return { gameId, mode, rows };
}
