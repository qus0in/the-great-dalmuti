import { DomainError } from './cards.js';
import {
  RANK_GREATER_DALMUTI,
  RANK_LESSER_DALMUTI,
  RANK_LESSER_PEON,
  RANK_GREATER_PEON,
} from './ranking.js';

export function selectTributeCards(hand, count) {
  if (!Array.isArray(hand) || hand.length < count) {
    throw new DomainError('Not enough cards for tribute', 'NOT_ENOUGH_CARDS');
  }
  const sorted = [...hand].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (a.id ?? '').localeCompare(b.id ?? '');
  });
  return sorted.slice(0, count);
}

function removeCards(hand, cardsToRemove) {
  const result = [...hand];
  for (const toRemove of cardsToRemove) {
    const idx = result.findIndex(
      (c) => c === toRemove || (c.id && c.id === toRemove.id),
    );
    if (idx === -1) {
      throw new DomainError('Card not in hand', 'CARD_NOT_IN_HAND');
    }
    result.splice(idx, 1);
  }
  return result;
}

function validateReturns(returns) {
  const gdReturns = returns[RANK_GREATER_DALMUTI] ?? returns.greaterDalmuti;
  const ldReturns = returns[RANK_LESSER_DALMUTI] ?? returns.lesserDalmuti;
  if (!Array.isArray(gdReturns) || gdReturns.length !== 2) {
    throw new DomainError(
      '대달무티 must return exactly 2 cards',
      'INVALID_CARD_COUNT',
    );
  }
  if (!Array.isArray(ldReturns) || ldReturns.length !== 1) {
    throw new DomainError(
      '소달무티 must return exactly 1 card',
      'INVALID_CARD_COUNT',
    );
  }
  return { gdReturns, ldReturns };
}

function swapHands(hands, peonTribute, dalmutiReturn) {
  const { gdReturns, ldReturns } = dalmutiReturn;
  const { gpBest, lpBest } = peonTribute;
  return {
    ...hands,
    [RANK_GREATER_DALMUTI]: [
      ...removeCards(hands[RANK_GREATER_DALMUTI], gdReturns),
      ...gpBest,
    ],
    [RANK_LESSER_DALMUTI]: [
      ...removeCards(hands[RANK_LESSER_DALMUTI], ldReturns),
      ...lpBest,
    ],
    [RANK_LESSER_PEON]: [
      ...removeCards(hands[RANK_LESSER_PEON], lpBest),
      ...ldReturns,
    ],
    [RANK_GREATER_PEON]: [
      ...removeCards(hands[RANK_GREATER_PEON], gpBest),
      ...gdReturns,
    ],
  };
}

export function exchangeTribute({ hands, returns }) {
  if (!hands || !returns) {
    throw new DomainError('Invalid tribute arguments', 'INVALID_ARGS');
  }
  const dalmutiReturn = validateReturns(returns);
  const peonTribute = {
    gpBest: selectTributeCards(hands[RANK_GREATER_PEON], 2),
    lpBest: selectTributeCards(hands[RANK_LESSER_PEON], 1),
  };
  const nextHands = swapHands(hands, peonTribute, dalmutiReturn);
  return {
    ...nextHands,
    hands: nextHands,
    exchanges: {
      greater: { given: peonTribute.gpBest, returned: dalmutiReturn.gdReturns },
      lesser: { given: peonTribute.lpBest, returned: dalmutiReturn.ldReturns },
    },
  };
}

export const executeTribute = exchangeTribute;
export const getBestCards = selectTributeCards;
