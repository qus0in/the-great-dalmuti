import { DomainError } from './cards.js';

export const RANK_GREATER_DALMUTI = '대달무티';
export const RANK_LESSER_DALMUTI = '소달무티';
export const RANK_LESSER_PEON = '소농노';
export const RANK_GREATER_PEON = '대농노';

export const SEAT_RANKS = Object.freeze([
  RANK_GREATER_DALMUTI,
  RANK_LESSER_DALMUTI,
  RANK_LESSER_PEON,
  RANK_GREATER_PEON,
]);

export function getRankByFinishPosition(position) {
  if (typeof position !== 'number' || position < 1 || position > 4) {
    throw new DomainError(
      `Invalid finish position: ${position}`,
      'INVALID_POSITION',
    );
  }
  return SEAT_RANKS[position - 1];
}

function resolvePlayerId(player) {
  if (typeof player === 'object' && player !== null) {
    return (
      player.id ?? player.playerId ?? player.name ?? JSON.stringify(player)
    );
  }
  return String(player);
}

function assertValidPlayers(players) {
  if (!Array.isArray(players) || players.length !== 4) {
    throw new DomainError(
      'Must provide exactly 4 players',
      'INVALID_PLAYER_COUNT',
    );
  }
  const keys = players.map(resolvePlayerId);
  if (new Set(keys).size !== 4) {
    throw new DomainError('Players must be distinct', 'DUPLICATE_PLAYERS');
  }
}

export function assignRanksByFinishOrder(finishOrder) {
  assertValidPlayers(finishOrder);
  return finishOrder.map((player, index) => {
    const rank = SEAT_RANKS[index];
    if (typeof player === 'object' && player !== null) {
      return { ...player, rank };
    }
    return { player, playerId: player, rank };
  });
}

export function drawInitialSeats(players, rng = Math.random) {
  assertValidPlayers(players);
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return assignRanksByFinishOrder(shuffled);
}

export const assignRanks = assignRanksByFinishOrder;
export const assignInitialSeats = drawInitialSeats;
