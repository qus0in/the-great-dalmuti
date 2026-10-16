import { assertOk } from './supabase-error.js';
import { rowToTrick, trickToRow, playToRow } from './trick-mappers.js';

async function fetchPlaysForTrick(client, trickId) {
  const playsRes = await client
    .from('game_trick_plays')
    .select('*')
    .eq('trick_id', trickId)
    .order('turn_no', { ascending: true });
  assertOk(playsRes);
  return playsRes.data ?? [];
}

export async function fetchCurrentTrick(client, gameId) {
  const trickRes = await client
    .from('game_tricks')
    .select('*')
    .eq('game_id', gameId)
    .is('winner_seat', null)
    .order('seq', { ascending: false });
  assertOk(trickRes);
  const row = trickRes.data?.[0];
  if (!row) return null;

  const plays = await fetchPlaysForTrick(client, row.id);
  return rowToTrick(row, plays);
}

export async function fetchLatestTrick(client, gameId) {
  const trickRes = await client
    .from('game_tricks')
    .select('*')
    .eq('game_id', gameId)
    .order('seq', { ascending: false });
  assertOk(trickRes);
  const row = trickRes.data?.[0];
  if (!row) return null;

  const plays = await fetchPlaysForTrick(client, row.id);
  return rowToTrick(row, plays);
}

export async function saveTrickAndPlays(client, _gameId, trick) {
  const trickRow = trickToRow(trick);
  const trickRes = await client.from('game_tricks').upsert(trickRow);
  assertOk(trickRes);

  if (!Array.isArray(trick.plays) || trick.plays.length === 0) {
    return;
  }

  const playRows = trick.plays.map((p) => playToRow(trick.id, p));
  const playsRes = await client
    .from('game_trick_plays')
    .upsert(playRows, { onConflict: 'trick_id,turn_no' });
  assertOk(playsRes);
}
