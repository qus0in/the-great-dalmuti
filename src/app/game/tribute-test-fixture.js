import { createCard } from '../../domain/game/cards.js';
import { createInMemoryGameRepository } from './fakes/in-memory-game-repository.js';

export function makeTestCards() {
  const gd = [createCard(10, 1), createCard(11, 1), createCard(12, 1)];
  const ld = [createCard(10, 2), createCard(12, 2)];
  const lp = [createCard(12, 3), createCard(2, 1)];
  const gp = [createCard(12, 4), createCard(1, 1), createCard(3, 1)];
  return { gd, ld, lp, gp };
}

const SEAT_DEFS = [
  { seat: 0, userId: 'u-gd', rank: '대달무티' },
  { seat: 1, userId: 'u-ld', rank: '소달무티' },
  { seat: 2, userId: 'u-lp', rank: '소농노' },
  { seat: 3, userId: 'u-gp', rank: '대농노' },
];

export function makeTestSeats() {
  return SEAT_DEFS.map((d) => ({ ...d, userName: d.rank, isBot: false }));
}

function buildInitialEntities(seats, phase, version) {
  const game = {
    id: 'game-1',
    joinCode: 'ROOM1',
    phase,
    version,
    hostSeat: 0,
    createdAt: '2026-10-16T12:00:00.000Z',
    updatedAt: '2026-10-16T12:00:00.000Z',
  };
  const publicState = {
    gameId: 'game-1',
    phase,
    version,
    currentTurnSeat: 0,
    seatSummary: seats.map((s) => ({
      seat: s.seat,
      userName: s.userName,
      isBot: false,
      cardCount: 3,
    })),
    lastPlay: null,
    updatedAt: '2026-10-16T12:00:00.000Z',
  };
  return { game, publicState };
}

export async function setupTributeFixture({
  phase = 'tribute',
  version = 1,
  handsOverride = null,
} = {}) {
  const gameRepository = createInMemoryGameRepository();
  const seats = makeTestSeats();
  const { gd, ld, lp, gp } = makeTestCards();
  const { game, publicState } = buildInitialEntities(seats, phase, version);
  await gameRepository.createGame({ game, seats, publicState });
  const hands = handsOverride ?? { 0: gd, 1: ld, 2: lp, 3: gp };
  await gameRepository.saveHands(game.id, hands);
  return {
    gameRepository,
    game,
    seats,
    publicState,
    cards: { gd, ld, lp, gp },
  };
}
