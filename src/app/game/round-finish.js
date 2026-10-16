import { randomUUID } from 'node:crypto';
import { startNextTrick } from '../../domain/game/trick.js';
import { assignRanksByFinishOrder } from '../../domain/game/ranking.js';
import { applyFinishPositions } from './round-support.js';

// 라운드 종료: 트릭 닫기 + 마지막 좌석 4위 + 순위 확정 (조공·전적은 U6·U9 몫)
export async function finishRound({
  gameRepository,
  game,
  seats,
  latest,
  state,
}) {
  await gameRepository.saveTrick(game.id, {
    ...latest,
    winnerSeat: Number(state.trick.lastPlay.playerId),
  });
  const waitingIndex = seats.findIndex((s) => s.finishPosition === null);
  const ordered = seats
    .map((seat, index) => ({
      ...seat,
      finishPosition: index === waitingIndex ? 4 : seat.finishPosition,
    }))
    .sort((a, b) => a.finishPosition - b.finishPosition)
    .map((s) => s.seat);
  return assignRanksByFinishOrder(ordered);
}

// 트릭 종료: 다음 트릭을 시작해 저장한다 (도메인 startNextTrick 재사용)
export async function openNextTrick({ gameRepository, game, latest, state }) {
  const advanced = startNextTrick(state);
  const leaderSeat = Number(advanced.turnId);
  await gameRepository.saveTrick(game.id, {
    id: randomUUID(),
    gameId: game.id,
    seq: latest.seq + 1,
    leaderSeat,
    passes: 0,
    winnerSeat: null,
    plays: [],
  });
  return leaderSeat;
}

// 트릭 종료 분기: 아웃 순서 기록 후 라운드 종료면 순위 확정, 아니면 다음 트릭 시작
export async function runAdvanceStep({
  gameRepository,
  game,
  seats,
  latest,
  state,
}) {
  const nextSeats = applyFinishPositions(seats, state.finishOrder);
  await gameRepository.saveSeats(game.id, nextSeats);
  if (state.status === 'round-ended') {
    const rankings = await finishRound({
      gameRepository,
      game,
      seats: nextSeats,
      latest,
      state,
    });
    return { roundEnded: true, rankings, turnSeat: null };
  }
  const turnSeat = await openNextTrick({ gameRepository, game, latest, state });
  return { roundEnded: false, rankings: null, turnSeat };
}

// 게임/공개 상태 갱신 (version 낙관적 잠금) — 라운드 종료 시 phase finished
export async function persistAdvance({
  gameRepository,
  game,
  publicState,
  roundEnded,
  turnSeat,
  nowIso,
}) {
  const nextGame = {
    ...game,
    phase: roundEnded ? 'finished' : game.phase,
    version: game.version + 1,
    updatedAt: nowIso,
  };
  const nextPublic = {
    ...publicState,
    phase: nextGame.phase,
    version: publicState.version + 1,
    currentTurnSeat: turnSeat,
    updatedAt: nowIso,
  };
  await gameRepository.saveGameAndPublic({
    game: nextGame,
    publicState: nextPublic,
    expectedVersion: game.version,
  });
  return { game: nextGame, publicState: nextPublic };
}
