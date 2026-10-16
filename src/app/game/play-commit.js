// 트릭·플레이 저장과 게임/공개 상태 갱신 (version 낙관적 잠금)

// 공개 상태 갱신: 남은 장수와 현재 트릭 공개 정보만 (손패 내용 금지)
export function buildNextPublic({ publicState, state, nowIso }) {
  const last = state.trick.lastPlay;
  return {
    ...publicState,
    version: publicState.version + 1,
    currentTurnSeat: state.turnId === null ? null : Number(state.turnId),
    seatSummary: publicState.seatSummary.map((s) => ({
      ...s,
      cardCount: state.handCounts[s.seat] ?? s.cardCount,
    })),
    lastPlay: last
      ? {
          seat: Number(last.playerId),
          rank: last.rank,
          count: last.count,
        }
      : publicState.lastPlay,
    updatedAt: nowIso,
  };
}

// 트릭 저장 → 게임/공개 상태를 version 낙관적 잠금으로 갱신
export async function persistAction({
  gameRepository,
  game,
  publicState,
  trick,
  state,
  row,
  nowIso,
}) {
  const trickEnded = state.status === 'ended';
  const roundEnded = state.status === 'round-ended';
  const winnerSeat = trickEnded
    ? Number(state.trick.lastPlay.playerId)
    : trick.winnerSeat;
  await gameRepository.saveTrick(game.id, {
    ...trick,
    plays: [...trick.plays, row],
    passes: state.trick.consecutivePasses,
    winnerSeat,
  });
  const nextGame = { ...game, version: game.version + 1, updatedAt: nowIso };
  const nextPublic = buildNextPublic({ publicState, state, nowIso });
  await gameRepository.saveGameAndPublic({
    game: nextGame,
    publicState: nextPublic,
    expectedVersion: game.version,
  });
  return { game: nextGame, publicState: nextPublic, trickEnded, roundEnded };
}
