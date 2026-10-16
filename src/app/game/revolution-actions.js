import { declareRevolution as declareRevolutionDomain } from '../../domain/game/revolution.js';
import { ConflictError } from './room-errors.js';
import {
  DEFAULT_CLOCK,
  buildRevolutionEntities,
  loadTributeRoom,
  resolveSeatRank,
} from './tribute-shared.js';

async function saveSeatsIfGreater(gameRepository, gameId, revolutionResult) {
  if (
    revolutionResult.isGreaterRevolution &&
    Array.isArray(revolutionResult.seats)
  ) {
    await gameRepository.saveSeats(gameId, revolutionResult.seats);
  }
}

async function commitRevolution({
  gameRepository,
  clock,
  agg,
  seat,
  revolutionResult,
}) {
  await saveSeatsIfGreater(gameRepository, agg.game.id, revolutionResult);
  const nowIso = clock.now().toISOString();
  const { game, publicState } = buildRevolutionEntities({
    agg,
    seat,
    revolutionResult,
    nowIso,
  });
  await gameRepository.saveGameAndPublic({
    game,
    publicState,
    expectedVersion: agg.game.version,
  });
  return {
    game,
    publicState,
    seats: revolutionResult.seats ?? agg.seats,
    revolution: revolutionResult,
  };
}

export async function declareRevolution(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, joinCode, gameId, user, version },
) {
  const { agg, seat } = await loadTributeRoom(gameRepository, {
    code,
    joinCode,
    gameId,
    user,
    version,
  });
  const hands = await gameRepository.findHands(agg.game.id);
  if (!hands) throw new ConflictError('Hands missing', 'CONFLICT');

  const seatRank = resolveSeatRank(seat);
  const userHand = hands[seat.seat] ?? hands[seatRank] ?? [];

  const revolutionResult = declareRevolutionDomain({
    declarer: seat.userId ?? String(seat.seat),
    hand: userHand,
    seatRank,
    seats: agg.seats,
    phase: 'before_tribute',
  });

  return commitRevolution({
    gameRepository,
    clock,
    agg,
    seat,
    revolutionResult,
  });
}
