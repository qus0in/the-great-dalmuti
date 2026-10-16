import { DomainError } from './cards.js';
import {
  RANK_GREATER_DALMUTI,
  RANK_LESSER_DALMUTI,
  RANK_LESSER_PEON,
  RANK_GREATER_PEON,
} from './ranking.js';

export const REVOLUTION_INVERSION = Object.freeze({
  [RANK_GREATER_DALMUTI]: RANK_GREATER_PEON,
  [RANK_LESSER_DALMUTI]: RANK_LESSER_PEON,
  [RANK_LESSER_PEON]: RANK_LESSER_DALMUTI,
  [RANK_GREATER_PEON]: RANK_GREATER_DALMUTI,
});

export function countJesters(hand) {
  if (!Array.isArray(hand)) return 0;
  return hand.filter(
    (card) => Boolean(card) && (card.rank === 13 || card.isJester),
  ).length;
}

export function canDeclareRevolution(hand) {
  return countJesters(hand) >= 2;
}

export function invertSeats(seats) {
  if (Array.isArray(seats)) {
    return seats.map((seat) => ({
      ...seat,
      rank: REVOLUTION_INVERSION[seat.rank] ?? seat.rank,
    }));
  }
  if (typeof seats === 'object' && seats !== null) {
    const next = {};
    for (const [key, value] of Object.entries(seats)) {
      if (REVOLUTION_INVERSION[value]) {
        next[key] = REVOLUTION_INVERSION[value];
      } else if (REVOLUTION_INVERSION[key]) {
        next[REVOLUTION_INVERSION[key]] = value;
      } else {
        next[key] = value;
      }
    }
    return next;
  }
  return seats;
}

function assertValidDeclaration(hand, phase) {
  if (phase !== 'before_tribute' && phase !== 'deal') {
    throw new DomainError(
      'Revolution can only be declared before tribute',
      'INVALID_PHASE',
    );
  }
  if (!canDeclareRevolution(hand)) {
    throw new DomainError(
      'Player must hold 2 jesters to declare revolution',
      'NOT_ENOUGH_JESTERS',
    );
  }
}

export function declareRevolution({
  declarer,
  hand,
  seatRank,
  seats,
  phase = 'before_tribute',
}) {
  assertValidDeclaration(hand, phase);
  const resolvedRank =
    seatRank ?? (typeof declarer === 'object' ? declarer?.rank : undefined);
  const isGreaterRevolution = resolvedRank === RANK_GREATER_PEON;
  const nextSeats = isGreaterRevolution && seats ? invertSeats(seats) : seats;

  return {
    isRevolution: true,
    isGreaterRevolution,
    skipTribute: true,
    declarer,
    seats: nextSeats,
  };
}
