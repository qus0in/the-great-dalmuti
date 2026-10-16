// 인메모리 가짜 저장소용 전적 메서드 (실 DB에서는 결과 행 + user_game_stats 뷰가 담당)

// 계정×모드 집계 — supabase 뷰(user_game_stats)와 같은 모양으로 만든다
export function summarizeResults(userId, rows) {
  const modes = {};
  for (const row of rows) {
    const agg = (modes[row.mode] ??= {
      user_id: userId,
      mode: row.mode,
      total_games: 0,
      rank_1_count: 0,
      rank_2_count: 0,
      rank_3_count: 0,
      rank_4_count: 0,
    });
    agg.total_games += 1;
    const key = `rank_${row.rank}_count`;
    agg[key] += 1;
  }
  return Object.values(modes);
}

const stores = new WeakMap();
function resultsOf(state) {
  if (!stores.has(state)) stores.set(state, new Map());
  return stores.get(state);
}

export function buildStatsMethods(state, clone) {
  const results = resultsOf(state);
  return {
    saveResults: (gameId, rows) => {
      for (const row of rows) {
        results.set(`${gameId}:${row.userId}`, clone({ ...row, gameId }));
      }
      return Promise.resolve();
    },
    findStatsByUser: (userId) => {
      const mine = [...results.values()].filter((r) => r.userId === userId);
      return Promise.resolve(summarizeResults(userId, mine));
    },
  };
}
