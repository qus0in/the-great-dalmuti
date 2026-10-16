import { TOTAL_CARD_COUNT, DomainError } from './cards.js';

const PLAYER_COUNT = 4;
const CARDS_PER_HAND = 20;

function resolveSeatKey(seat) {
  if (typeof seat === 'object' && seat !== null) {
    return seat.seatId ?? seat.id ?? String(seat);
  }
  return String(seat);
}

function findStartIndex(seatOrder) {
  const index = seatOrder.findIndex((s) => {
    if (typeof s === 'object' && s !== null) {
      return s.rank === '대달무티' || s.role === '대달무티';
    }
    return String(s) === '대달무티';
  });
  return index >= 0 ? index : 0;
}

export function deal(deck, seatOrder) {
  if (!Array.isArray(deck) || deck.length !== TOTAL_CARD_COUNT) {
    throw new DomainError('Deck must contain 80 cards', 'INVALID_DECK');
  }
  if (!Array.isArray(seatOrder) || seatOrder.length !== PLAYER_COUNT) {
    throw new DomainError(
      'Seat order must contain 4 seats',
      'INVALID_SEAT_ORDER',
    );
  }

  const hands = {};
  const seatKeys = seatOrder.map(resolveSeatKey);
  for (const key of seatKeys) {
    hands[key] = [];
  }

  const startIndex = findStartIndex(seatOrder);
  for (let i = 0; i < deck.length; i += 1) {
    const seatKey = seatKeys[(startIndex + i) % PLAYER_COUNT];
    hands[seatKey].push(deck[i]);
  }

  return {
    ...hands,
    hands,
    dealOrder: seatKeys,
    cardsPerHand: CARDS_PER_HAND,
  };
}
