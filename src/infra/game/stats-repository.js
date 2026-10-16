import { assertOk } from './supabase-error.js';
import { SEAT_RANKS } from '../../domain/game/ranking.js';

function sqlRank(rank) {
  if (Number.isInteger(rank) && rank >= 1 && rank <= SEAT_RANKS.length) {
    return rank;
  }
  const index = SEAT_RANKS.indexOf(rank);
  return index < 0 ? rank : index + 1;
}

function resultToRow(gameId, row) {
  return {
    game_id: gameId,
    user_id: row.userId,
    mode: row.mode,
    rank: sqlRank(row.rank),
    played_at: row.playedAt,
  };
}

export function buildStatsMethods(client) {
  return {
    saveResults: async (gameId, rows) => {
      if (rows.length === 0) return;
      const res = await client.from('game_results').upsert(
        rows.map((row) => resultToRow(gameId, row)),
        {
          onConflict: 'game_id,user_id',
          ignoreDuplicates: true,
        },
      );
      assertOk(res);
    },
    findStatsByUser: async (userId) => {
      const res = await client
        .from('user_game_stats')
        .select('*')
        .eq('user_id', userId);
      assertOk(res);
      return res.data ?? [];
    },
  };
}
