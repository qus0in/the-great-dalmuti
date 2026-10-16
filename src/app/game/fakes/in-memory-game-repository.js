import { ConflictError } from '../room-errors.js';
import { buildStatsMethods } from '../stats-store.js';
const clone = (data) => JSON.parse(JSON.stringify(data));
const openOf = (trick) => (trick && trick.winnerSeat === null ? trick : null);
const latestOf = (state, gameId) => {
  const found = [...state.tricks.values()].filter((t) => t.gameId === gameId);
  return found.sort((a, b) => b.seq - a.seq).map(clone)[0] ?? null;
};
function findByCode(state, joinCode) {
  for (const game of state.games.values()) {
    if (game.joinCode === joinCode) {
      return {
        game: clone(game),
        seats: clone(state.seats.get(game.id) ?? []),
        publicState: clone(state.public.get(game.id) ?? null),
      };
    }
  }
  return null;
}

function findById(state, gameId) {
  const game = state.games.get(gameId);
  if (!game) return null;
  return {
    game: clone(game),
    seats: clone(state.seats.get(gameId) ?? []),
    publicState: clone(state.public.get(gameId) ?? null),
  };
}

function updateGameAndPublic(state, { game, publicState, expectedVersion }) {
  const current = state.games.get(game.id);
  if (current && current.version !== expectedVersion) {
    throw new ConflictError('Stale game version', 'STALE_VERSION');
  }
  state.games.set(game.id, clone(game));
  state.public.set(game.id, clone(publicState));
}

function buildFindMethods(state) {
  return {
    findGameByCode: async (code) => {
      await Promise.resolve();
      return findByCode(state, code);
    },
    findGameById: async (id) => {
      await Promise.resolve();
      return findById(state, id);
    },
    findHands: async (id) => {
      await Promise.resolve();
      const hands = state.hands.get(id);
      return hands ? clone(hands) : null;
    },
  };
}

function buildSaveMethods(state) {
  return {
    createGame: async ({ game, seats, publicState }) => {
      await Promise.resolve();
      state.games.set(game.id, clone(game));
      state.seats.set(game.id, clone(seats));
      state.public.set(game.id, clone(publicState));
    },
    saveSeats: async (id, seats) => {
      await Promise.resolve();
      state.seats.set(id, clone(seats));
    },
    saveHands: async (id, hands) => {
      await Promise.resolve();
      state.hands.set(id, clone(hands));
    },
    saveGameAndPublic: async (params) => {
      await Promise.resolve();
      updateGameAndPublic(state, params);
    },
    findCurrentTrick: (gameId) =>
      Promise.resolve(openOf(latestOf(state, gameId))),
    findLatestTrick: (gameId) => Promise.resolve(latestOf(state, gameId)),
    saveTrick: (gameId, trick) =>
      Promise.resolve(state.tricks.set(trick.id, clone(trick))),
  };
}

export function createInMemoryGameRepository() {
  const state = {
    games: new Map(),
    seats: new Map(),
    hands: new Map(),
    public: new Map(),
    tricks: new Map(),
  };
  return {
    ...buildFindMethods(state),
    ...buildSaveMethods(state),
    ...buildStatsMethods(state, clone),
  };
}
