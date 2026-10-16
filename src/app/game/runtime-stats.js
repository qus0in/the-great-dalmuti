import { assignRanksByFinishOrder } from '../../domain/game/ranking.js';
import { recordGameResults } from './stats-record.js';

// 순위: U13 응답의 rankings를 우선 쓰고, 없으면 저장된 finishPosition에서 만든다
export function resolveRankings(result, agg) {
  if (Array.isArray(result?.rankings) && result.rankings.length > 0) {
    return result.rankings;
  }
  const ordered = [...agg.seats]
    .filter((s) => s.finishPosition !== null)
    .sort((a, b) => a.finishPosition - b.finishPosition)
    .map((s) => String(s.seat));
  return ordered.length === agg.seats.length
    ? assignRanksByFinishOrder(ordered)
    : null;
}

// 대행 이력 좌석 → 사용자 ID (봇 userId null은 제외)
export function substitutedUserIds(substitutions, code, agg) {
  return substitutions
    .seatsIn(code)
    .map((seat) => agg.seats.find((s) => s.seat === seat)?.userId)
    .filter((id) => typeof id === 'string' && id.length > 0);
}

// 판 종료 전적 기록: 방마다 정확히 한 번만 호출한다
export function createStatsRecorder({
  gameRepository,
  clock,
  substitutions,
  onError,
}) {
  const recorded = new Set();

  return async function recordOnce(code, result) {
    if (recorded.has(code)) return null;
    try {
      const agg = await gameRepository.findGameByCode(code);
      if (!agg || agg.game.phase !== 'finished') return null;
      const rankings = resolveRankings(result, agg);
      if (!rankings) return null;
      await recordGameResults(
        { gameRepository, clock },
        {
          gameId: agg.game.id,
          rankings,
          substitutedUserIds: substitutedUserIds(substitutions, code, agg),
        },
      );
      recorded.add(code);
      return rankings;
    } catch (err) {
      onError(err, { code });
      return null;
    }
  };
}
