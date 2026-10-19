import {
  RANK_GREATER_DALMUTI,
  RANK_LESSER_DALMUTI,
  RANK_LESSER_PEON,
  RANK_GREATER_PEON,
  resolveSeatRank,
} from './tribute-shared.js';

export function buildRankMap(seats) {
  const rankToSeat = {};
  for (const s of seats) {
    rankToSeat[resolveSeatRank(s)] = s.seat;
  }
  return rankToSeat;
}

export function extractDomainHands(hands, rankToSeat) {
  return {
    [RANK_GREATER_DALMUTI]:
      hands[rankToSeat[RANK_GREATER_DALMUTI]] ?? hands[RANK_GREATER_DALMUTI],
    [RANK_LESSER_DALMUTI]:
      hands[rankToSeat[RANK_LESSER_DALMUTI]] ?? hands[RANK_LESSER_DALMUTI],
    [RANK_LESSER_PEON]:
      hands[rankToSeat[RANK_LESSER_PEON]] ?? hands[RANK_LESSER_PEON],
    [RANK_GREATER_PEON]:
      hands[rankToSeat[RANK_GREATER_PEON]] ?? hands[RANK_GREATER_PEON],
  };
}

export function normalizeReturns(returns, rankToSeat) {
  if (!returns) return returns;
  const gdSeat = rankToSeat[RANK_GREATER_DALMUTI];
  const ldSeat = rankToSeat[RANK_LESSER_DALMUTI];
  return {
    ...returns,
    [RANK_GREATER_DALMUTI]:
      returns[RANK_GREATER_DALMUTI] ??
      returns[gdSeat] ??
      returns.greaterDalmuti,
    [RANK_LESSER_DALMUTI]:
      returns[RANK_LESSER_DALMUTI] ?? returns[ldSeat] ?? returns.lesserDalmuti,
  };
}

export function mapHandsBack(hands, exchanged, rankToSeat) {
  const nextHands = { ...hands };
  if (rankToSeat[RANK_GREATER_DALMUTI] !== undefined) {
    nextHands[rankToSeat[RANK_GREATER_DALMUTI]] =
      exchanged[RANK_GREATER_DALMUTI];
    nextHands[rankToSeat[RANK_LESSER_DALMUTI]] = exchanged[RANK_LESSER_DALMUTI];
    nextHands[rankToSeat[RANK_LESSER_PEON]] = exchanged[RANK_LESSER_PEON];
    nextHands[rankToSeat[RANK_GREATER_PEON]] = exchanged[RANK_GREATER_PEON];
  } else {
    Object.assign(nextHands, exchanged);
  }
  return nextHands;
}

export function buildNextTributeEntities({ agg, nextHands, nowIso }) {
  const nextGame = {
    ...agg.game,
    phase: 'playing',
    version: agg.game.version + 1,
    updatedAt: nowIso,
  };
  const nextPublic = {
    ...agg.publicState,
    phase: 'playing',
    version: agg.game.version + 1,
    seatSummary: agg.seats.map((s) => ({
      seat: s.seat,
      userId: s.userId ?? null,
      userName: s.userName ?? (s.isBot ? `봇 ${s.seat}` : `참가자 ${s.seat}`),
      isBot: s.isBot,
      cardCount: (nextHands[s.seat] ?? nextHands[resolveSeatRank(s)] ?? [])
        .length,
      finishPosition: s.finishPosition ?? null,
    })),
    tribute: { greaterCount: 2, lesserCount: 1 },
    updatedAt: nowIso,
  };
  return { nextGame, nextPublic };
}
