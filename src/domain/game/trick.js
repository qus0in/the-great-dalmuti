import { DomainError } from './cards.js';
import {
  TRICK_ERROR_CODES,
  activePlayerIds,
  nextClockwiseId,
  newTrick,
  createTrickState,
} from './trick-state.js';
import { resolvePlayParams, buildNextPlayState } from './trick-play.js';

export { TRICK_ERROR_CODES, activePlayerIds, createTrickState };

function validateActor(state, playerId) {
  if (state.status === 'ended') {
    throw new DomainError('Trick ended', TRICK_ERROR_CODES.TRICK_ENDED);
  }
  if (state.status === 'round-ended') {
    throw new DomainError('Round ended', TRICK_ERROR_CODES.ROUND_ENDED);
  }
  if (!(state.handCounts[playerId] > 0)) {
    throw new DomainError('Player already out', TRICK_ERROR_CODES.PLAYER_OUT);
  }
  if (playerId !== state.turnId) {
    throw new DomainError('Not your turn', TRICK_ERROR_CODES.NOT_YOUR_TURN);
  }
}

export function play(state, playerId, cardAction) {
  validateActor(state, playerId);
  const playResult = resolvePlayParams(state, playerId, cardAction);
  const nextHandCounts = {
    ...state.handCounts,
    [playerId]: state.handCounts[playerId] - playResult.count,
  };
  return buildNextPlayState(state, { playerId, playResult, nextHandCounts });
}

function handleTrickEnding(state, passes) {
  const lastId = state.trick.lastPlay.playerId;
  const nextLeadId =
    state.handCounts[lastId] > 0
      ? lastId
      : nextClockwiseId(state.playerOrder, lastId, state.handCounts);
  return {
    ...state,
    status: 'ended',
    nextLeadId,
    turnId: nextLeadId,
    trick: { ...state.trick, consecutivePasses: passes },
  };
}

export function pass(state, playerId) {
  validateActor(state, playerId);
  if (state.trick.lastPlay === null) {
    throw new DomainError(
      'Leader must play',
      TRICK_ERROR_CODES.PASS_NOT_ALLOWED,
    );
  }
  const passes = state.trick.consecutivePasses + 1;
  const otherActive = activePlayerIds(state).filter(
    (id) => id !== state.trick.lastPlay.playerId,
  ).length;

  if (passes >= otherActive) {
    return handleTrickEnding(state, passes);
  }
  return {
    ...state,
    turnId: nextClockwiseId(state.playerOrder, playerId, state.handCounts),
    trick: { ...state.trick, consecutivePasses: passes },
  };
}

export function startNextTrick(state) {
  if (state.status !== 'ended') {
    throw new DomainError('Trick not ended', TRICK_ERROR_CODES.TRICK_ENDED);
  }
  if (!state.nextLeadId) {
    throw new DomainError('No active leader', TRICK_ERROR_CODES.TRICK_ENDED);
  }
  return {
    ...state,
    status: 'in-progress',
    turnId: state.nextLeadId,
    nextLeadId: null,
    trick: newTrick(state.nextLeadId),
  };
}
