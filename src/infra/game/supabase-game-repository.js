import { ConflictError } from '../../app/game/room-errors.js';
import { assertOk, SupabaseError } from './supabase-error.js';
import { fetchAggregate } from './aggregate-fetcher.js';
import {
  gameToRow,
  seatToRow,
  publicToRow,
  handsToRows,
  rowsToHands,
} from './mappers.js';

export { SupabaseError };

async function updateWithLock(client, { game, publicState, expectedVersion }) {
  const res = await client
    .from('games')
    .update(gameToRow(game))
    .eq('id', game.id)
    .eq('version', expectedVersion)
    .select();
  assertOk(res);

  if (!res.data || res.data.length === 0) {
    throw new ConflictError('Stale game version', 'STALE_VERSION');
  }

  const pubRes = await client
    .from('game_public')
    .upsert(publicToRow(publicState));
  assertOk(pubRes);
}

function buildSaveMethods(client) {
  return {
    saveSeats: async (_id, seats) => {
      const res = await client.from('game_seats').upsert(seats.map(seatToRow));
      assertOk(res);
    },
    saveHands: async (gameId, hands) => {
      const res = await client
        .from('game_hands')
        .upsert(handsToRows(gameId, hands));
      assertOk(res);
    },
    saveGameAndPublic: (params) => updateWithLock(client, params),
  };
}

export function createSupabaseGameRepository({ client }) {
  return {
    createGame: async ({ game, seats, publicState }) => {
      const r1 = await client.from('games').insert(gameToRow(game));
      assertOk(r1);
      const r2 = await client.from('game_seats').insert(seats.map(seatToRow));
      assertOk(r2);
      const r3 = await client
        .from('game_public')
        .insert(publicToRow(publicState));
      assertOk(r3);
    },
    findGameByCode: (joinCode) => fetchAggregate(client, 'join_code', joinCode),
    findGameById: (gameId) => fetchAggregate(client, 'id', gameId),
    findHands: async (gameId) => {
      const res = await client
        .from('game_hands')
        .select('*')
        .eq('game_id', gameId);
      assertOk(res);
      return res.data && res.data.length > 0 ? rowsToHands(res.data) : null;
    },
    ...buildSaveMethods(client),
  };
}
