import { DomainError } from './cards.js';

export const TRICK_ERROR_CODES = Object.freeze({
  INVALID_TRICK_INPUT: 'INVALID_TRICK_INPUT',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  PLAYER_OUT: 'PLAYER_OUT',
  INVALID_PLAY: 'INVALID_PLAY',
  PASS_NOT_ALLOWED: 'PASS_NOT_ALLOWED',
  TRICK_ENDED: 'TRICK_ENDED',
  ROUND_ENDED: 'ROUND_ENDED',
});

export function activePlayerIds(state) {
  const counts = state.handCounts ?? {};
  return Object.keys(counts).filter((id) => counts[id] > 0);
}

export function nextClockwiseId(order, fromId, handCounts) {
  const start = order.indexOf(fromId);
  if (start === -1) return null;
  for (let step = 1; step <= order.length; step += 1) {
    const id = order[(start + step) % order.length];
    if (handCounts[id] > 0) {
      return id;
    }
  }
  return null;
}

export function newTrick(leaderId) {
  return {
    leaderId,
    plays: [],
    lastPlay: null,
    consecutivePasses: 0,
  };
}

function validateInput(playerOrder, leaderId, handCounts) {
  if (!Array.isArray(playerOrder) || playerOrder.length === 0) {
    throw new DomainError(
      'Invalid player order',
      TRICK_ERROR_CODES.INVALID_TRICK_INPUT,
    );
  }
  if (!handCounts || typeof handCounts !== 'object') {
    throw new DomainError(
      'Invalid hand counts',
      TRICK_ERROR_CODES.INVALID_TRICK_INPUT,
    );
  }
  if (!playerOrder.includes(leaderId) || !(handCounts[leaderId] > 0)) {
    throw new DomainError(
      'Leader must be active',
      TRICK_ERROR_CODES.INVALID_TRICK_INPUT,
    );
  }
}

export function createTrickState({ playerOrder, leaderId, handCounts, hands }) {
  validateInput(playerOrder, leaderId, handCounts);
  return {
    playerOrder: [...playerOrder],
    handCounts: { ...handCounts },
    hands: hands ? { ...hands } : undefined,
    turnId: leaderId,
    trick: newTrick(leaderId),
    finishOrder: [],
    status: 'in-progress',
    nextLeadId: null,
  };
}
