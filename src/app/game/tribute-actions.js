import { exchangeTribute } from '../../domain/game/tribute.js';
import { ConflictError } from './room-errors.js';
import {
  DEFAULT_CLOCK,
  assertCanSubmitTribute,
  loadTributeRoom,
} from './tribute-shared.js';
import {
  buildNextTributeEntities,
  buildRankMap,
  extractDomainHands,
  normalizeReturns,
  mapHandsBack,
} from './tribute-hands.js';

async function commitTribute({ gameRepository, clock, agg, nextHands }) {
  await gameRepository.saveHands(agg.game.id, nextHands);
  const nowIso = clock.now().toISOString();
  const { nextGame, nextPublic } = buildNextTributeEntities({
    agg,
    nextHands,
    nowIso,
  });
  await gameRepository.saveGameAndPublic({
    game: nextGame,
    publicState: nextPublic,
    expectedVersion: agg.game.version,
  });
  return {
    game: nextGame,
    publicState: nextPublic,
    hands: nextHands,
    exchanges: {
      greater: { givenCount: 2, returnedCount: 2 },
      lesser: { givenCount: 1, returnedCount: 1 },
    },
  };
}

// 조공 실행 본체: 사용자 경로·좌석 지정 경로가 공유한다
async function executeTribute(
  { gameRepository, clock },
  { agg, seat, returns },
) {
  assertCanSubmitTribute(agg, seat);
  const hands = await gameRepository.findHands(agg.game.id);
  if (!hands) throw new ConflictError('Hands missing', 'CONFLICT');

  const rankToSeat = buildRankMap(agg.seats);
  const domainHands = extractDomainHands(hands, rankToSeat);
  const result = exchangeTribute({
    hands: domainHands,
    returns: normalizeReturns(returns, rankToSeat),
  });
  const nextHands = mapHandsBack(hands, result.hands, rankToSeat);

  return commitTribute({
    gameRepository,
    clock,
    agg,
    nextHands,
  });
}

export async function submitTribute(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, joinCode, gameId, user, returns, version },
) {
  const { agg, seat } = await loadTributeRoom(gameRepository, {
    code,
    joinCode,
    gameId,
    user,
    version,
  });
  return executeTribute({ gameRepository, clock }, { agg, seat, returns });
}

// 서버 내부용 조공: 좌석 번호로 직접 실행한다 (봇·타이머 대행용, HTTP 미노출)
export async function submitTributeAsSeat(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, joinCode, gameId, seat, returns, version },
) {
  const { agg, seat: resolved } = await loadTributeRoom(gameRepository, {
    code,
    joinCode,
    gameId,
    seat,
    version,
  });
  return executeTribute(
    { gameRepository, clock },
    { agg, seat: resolved, returns },
  );
}
