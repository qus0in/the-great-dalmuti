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
