import { assertOk } from './supabase-error.js';
import { rowToGame, rowToSeat, rowToPublic } from './mappers.js';

export async function fetchAggregate(client, column, value) {
  const gameRes = await client
    .from('games')
    .select('*')
    .eq(column, value)
    .maybeSingle();
  assertOk(gameRes);
  if (!gameRes.data) return null;

  const [seatsRes, publicRes] = await Promise.all([
    client
      .from('game_seats')
      .select('*')
      .eq('game_id', gameRes.data.id)
      .order('seat'),
    client
      .from('game_public')
      .select('*')
      .eq('game_id', gameRes.data.id)
      .maybeSingle(),
  ]);
  assertOk(seatsRes);
  assertOk(publicRes);

  return {
    game: rowToGame(gameRes.data),
    seats: (seatsRes.data ?? []).map(rowToSeat),
    publicState: publicRes.data ? rowToPublic(publicRes.data) : null,
  };
}
