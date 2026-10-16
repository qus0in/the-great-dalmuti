import { DomainError } from './cards.js';
import { assertPlayable } from './play.js';
import { TRICK_ERROR_CODES, nextClockwiseId } from './trick-state.js';

function assertPlayObject(playObj, lastPlay, availableCount) {
  const { rank, count } = playObj ?? {};
  if (
    !Number.isInteger(rank) ||
    rank <= 0 ||
    !Number.isInteger(count) ||
    count <= 0
  ) {
    throw new DomainError('Invalid play', TRICK_ERROR_CODES.INVALID_PLAY);
  }
  if (count > availableCount) {
    throw new DomainError('Invalid play count', TRICK_ERROR_CODES.INVALID_PLAY);
  }
  if (lastPlay) {
    if (count !== lastPlay.count)
      throw new DomainError('Count mismatch', 'COUNT_MISMATCH');
    if (rank >= lastPlay.rank)
      throw new DomainError('Not higher', 'NOT_HIGHER');
  }
  return { rank, count };
}

export function resolvePlayParams(state, playerId, cardAction) {
  if (Array.isArray(cardAction)) {
    const playResult = assertPlayable(state.trick.lastPlay, cardAction);
    return { rank: playResult.rank, count: playResult.count };
  }
  return assertPlayObject(
    cardAction,
    state.trick.lastPlay,
    state.handCounts[playerId],
  );
}

function handleRoundEnd(
  state,
  { played, plays, finishOrder, active, nextHandCounts },
) {
  const finalOrder =
    active.length === 1 ? [...finishOrder, active[0]] : finishOrder;
  return {
    ...state,
    handCounts: nextHandCounts,
    finishOrder: finalOrder,
    status: 'round-ended',
    turnId: null,
    trick: { ...state.trick, plays, lastPlay: played },
  };
}

export function buildNextPlayState(
  state,
  { playerId, playResult, nextHandCounts },
) {
  const played = { playerId, ...playResult };
  const plays = [...state.trick.plays, played];
  const out = nextHandCounts[playerId] === 0;
  const finishOrder = out
    ? [...state.finishOrder, playerId]
    : state.finishOrder;
  const active = Object.keys(nextHandCounts).filter(
    (id) => nextHandCounts[id] > 0,
  );

  if (active.length <= 1) {
    return handleRoundEnd(state, {
      played,
      plays,
      finishOrder,
      active,
      nextHandCounts,
    });
  }
  return {
    ...state,
    handCounts: nextHandCounts,
    finishOrder,
    turnId: nextClockwiseId(state.playerOrder, playerId, nextHandCounts),
    trick: { ...state.trick, plays, lastPlay: played, consecutivePasses: 0 },
  };
}
