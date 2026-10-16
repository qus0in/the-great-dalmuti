import { DomainError } from './cards.js';

export function isJesterCard(card) {
  return Boolean(card) && card.rank === 13;
}

function rankOfCard(card) {
  if (!card || typeof card.rank !== 'number') {
    throw new DomainError('Invalid play card', 'INVALID_PLAY');
  }
  return card.rank;
}

export function resolvePlayRank(cards) {
  let foundRank;
  for (const card of cards) {
    const rank = rankOfCard(card);
    if (isJesterCard(card)) continue;
    if (foundRank !== undefined && foundRank !== rank) {
      throw new DomainError('Play mixes ranks', 'MIXED_RANKS');
    }
    foundRank = rank;
  }
  return foundRank === undefined ? 13 : foundRank;
}

export function evaluatePlay(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new DomainError('Play must not be empty', 'EMPTY_PLAY');
  }
  const hasInvalid = cards.some(
    (card) => !card || typeof card.rank !== 'number',
  );
  if (hasInvalid) {
    throw new DomainError('Invalid play cards', 'INVALID_PLAY');
  }
  return { rank: resolvePlayRank(cards), count: cards.length };
}

export function canBeat(previousPlay, nextPlay) {
  if (!previousPlay || !nextPlay) return false;
  return (
    nextPlay.count === previousPlay.count && nextPlay.rank < previousPlay.rank
  );
}

export function assertPlayable(previousPlay, cards) {
  const nextPlay = evaluatePlay(cards);
  if (previousPlay === null) {
    return nextPlay;
  }
  if (nextPlay.count !== previousPlay.count) {
    throw new DomainError('Play count does not match', 'COUNT_MISMATCH');
  }
  if (nextPlay.rank >= previousPlay.rank) {
    throw new DomainError('Play is not higher', 'NOT_HIGHER');
  }
  return nextPlay;
}
