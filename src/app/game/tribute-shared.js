import {
  RANK_GREATER_DALMUTI,
  RANK_LESSER_DALMUTI,
  RANK_LESSER_PEON,
  RANK_GREATER_PEON,
  SEAT_RANKS,
  getRankByFinishPosition,
} from '../../domain/game/ranking.js';
import { ConflictError, ForbiddenError, NotFoundError } from './room-errors.js';

export const DEFAULT_CLOCK = Object.freeze({ now: () => new Date() });

export {
  RANK_GREATER_DALMUTI,
  RANK_LESSER_DALMUTI,
  RANK_LESSER_PEON,
  RANK_GREATER_PEON,
};

export function resolveSeatRank(seat) {
  if (seat?.rank) return seat.rank;
  if (
    typeof seat?.finishPosition === 'number' &&
    seat.finishPosition >= 1 &&
    seat.finishPosition <= 4
  ) {
    return getRankByFinishPosition(seat.finishPosition);
  }
  return SEAT_RANKS[seat?.seat ?? 0];
}

export function assertCanSubmitTribute(agg, seat) {
  const userRank = resolveSeatRank(seat);
  const isPeon =
    userRank === RANK_GREATER_PEON || userRank === RANK_LESSER_PEON;
  if (isPeon && agg.game.hostSeat !== seat.seat) {
    throw new ForbiddenError(
      'Peons cannot submit tribute returns',
      'FORBIDDEN',
    );
  }
}

function findAggregate(gameRepository, { code, joinCode, gameId }) {
  const roomCode = code ?? joinCode;
  if (roomCode) return gameRepository.findGameByCode(roomCode);
  if (gameId) return gameRepository.findGameById(gameId);
  return Promise.resolve(null);
}

export async function loadTributeRoom(
  gameRepository,
  { code, joinCode, gameId, user, seat: seatNo, version },
) {
  const agg = await findAggregate(gameRepository, { code, joinCode, gameId });
  if (!agg) throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
  if (agg.game.phase !== 'tribute' && agg.game.phase !== 'before_tribute') {
    throw new ConflictError('Not in tribute phase', 'CONFLICT');
  }
  if (version !== undefined && agg.game.version !== version) {
    throw new ConflictError('Stale version', 'STALE_VERSION');
  }
  const seat =
    seatNo === undefined
      ? agg.seats.find((s) => s.userId === user?.id)
      : agg.seats.find((s) => s.seat === seatNo);
  if (!seat) throw new ForbiddenError('Not seated', 'FORBIDDEN');
  return { agg, seat };
}

export function buildRevolutionEntities({
  agg,
  seat,
  revolutionResult,
  nowIso,
}) {
  const nextVersion = agg.game.version + 1;
  const game = {
    ...agg.game,
    phase: 'playing',
    version: nextVersion,
    updatedAt: nowIso,
  };
  const publicState = {
    ...agg.publicState,
    phase: 'playing',
    version: nextVersion,
    revolution: {
      isRevolution: true,
      isGreaterRevolution: revolutionResult.isGreaterRevolution,
      declarerSeat: seat.seat,
    },
    updatedAt: nowIso,
  };
  return { game, publicState };
}
