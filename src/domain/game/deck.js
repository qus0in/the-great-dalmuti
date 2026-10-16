import {
  CARD_DEFINITIONS,
  TOTAL_CARD_COUNT,
  DomainError,
  createCard,
} from './cards.js';

export function createDeck() {
  const cards = [];
  for (const def of CARD_DEFINITIONS) {
    for (let i = 1; i <= def.count; i += 1) {
      cards.push(createCard(def.rank, i));
    }
  }
  return cards;
}

export function shuffle(deck, rng = Math.random) {
  if (!Array.isArray(deck) || deck.length !== TOTAL_CARD_COUNT) {
    throw new DomainError('Deck must contain 80 cards', 'INVALID_DECK');
  }
  if (typeof rng !== 'function') {
    throw new DomainError('rng must be a function', 'INVALID_RNG');
  }

  const result = [...deck];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const rand = rng();
    const j = Math.floor(rand * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
