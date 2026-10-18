import { createDeck, shuffle } from '../../domain/game/deck.js';
import { deal } from '../../domain/game/deal.js';
export function createFakeScheduler() {
  let nextId = 0;
  let sets = 0;
  const timers = new Map();
  return {
    setTimer(fn, ms) {
      sets += 1;
      nextId += 1;
      timers.set(nextId, { fn, ms });
      return nextId;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    fire(id) {
      const timer = timers.get(id);
      timers.delete(id);
      return timer ? timer.fn() : null;
    },
    pending: () => [...timers.keys()],
    delays: () => [...timers.values()].map((t) => t.ms),
    setCount: () => sets,
  };
}
export function botSeat(seat) {
  return { seat, userId: null, isBot: true, finishPosition: null };
}
export function humanSeat(seat, id = `u${seat}`) {
  return { seat, userId: id, isBot: false, finishPosition: null };
}
function buildGame({ code, gameId, phase, turnSeat, seats }) {
  const version = phase === 'playing' ? 1 : 9;
  const stamp = '2026-10-16T12:00:00.000Z';
  return {
    game: {
      id: gameId,
      joinCode: code,
      phase,
      version,
      hostSeat: 0,
      createdAt: stamp,
      updatedAt: stamp,
    },
    publicState: {
      gameId,
      phase,
      version,
      currentTurnSeat: turnSeat,
      seatSummary: seats.map((s) => ({
        seat: s.seat,
        userId: s.userId ?? null,
        userName: s.userId ?? `seat ${s.seat}`,
        isBot: s.isBot,
        cardCount: 20,
      })),
      lastPlay: null,
      updatedAt: stamp,
    },
  };
}
function withFinishPositions(seats, finishPositions) {
  return seats.map((s, index) => ({
    ...s,
    finishPosition: finishPositions ? finishPositions[index] : s.finishPosition,
  }));
}
export async function seedRoom(
  repository,
  {
    code = 'ROOM1',
    gameId = 'g1',
    phase = 'playing',
    turnSeat = 0,
    seats = [humanSeat(0), botSeat(1), botSeat(2), humanSeat(3)],
    finishPositions = null,
  } = {},
) {
  const withFinish = withFinishPositions(seats, finishPositions);
  const { game, publicState } = buildGame({
    code,
    gameId,
    phase,
    turnSeat,
    seats: withFinish,
  });
  await repository.createGame({ game, seats: withFinish, publicState });
  const shuffled = shuffle(createDeck(), () => 0.5);
  const { hands } = deal(shuffled, [0, 1, 2, 3]);
  await repository.saveHands(gameId, {
    0: hands['0'],
    1: hands['1'],
    2: hands['2'],
    3: hands['3'],
  });
  return { game, seats: withFinish };
}
