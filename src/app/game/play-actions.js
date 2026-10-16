import { pass, play } from '../../domain/game/trick.js';
import { persistAction } from './play-commit.js';
import { advanceAfterTrick } from './round-advance.js';
import {
  loadPlayContext,
  removeCards,
  resolveHandCards,
} from './play-shared.js';

const DEFAULT_CLOCK = { now: () => new Date() };

// 트릭·라운드가 끝난 직후 서버가 다음 진행을 스스로 수행한다 (결정 96)
async function advanceIfNeeded({ gameRepository, clock }, code, persisted) {
  if (!persisted.trickEnded && !persisted.roundEnded) return persisted;
  const advanced = await advanceAfterTrick({ gameRepository, clock }, { code });
  return { ...persisted, ...advanced };
}

// 내기 실행 본체: 사용자 경로·좌석 지정 경로가 공유한다 (읽기만 하고 새 손패로 저장)
async function executePlay({ gameRepository, clock }, { ctx, cards, code }) {
  const playedCards = resolveHandCards(ctx.hands[ctx.seat], cards);
  const nextState = play(ctx.state, String(ctx.seat), playedCards);
  const nextHands = {
    ...ctx.hands,
    [ctx.seat]: removeCards(ctx.hands[ctx.seat], playedCards),
  };
  await gameRepository.saveHands(ctx.game.id, nextHands);
  const persisted = await persistAction({
    gameRepository,
    game: ctx.game,
    publicState: ctx.publicState,
    trick: ctx.trick,
    state: nextState,
    row: {
      turnNo: ctx.trick.plays.length + 1,
      seat: ctx.seat,
      action: 'play',
      cards: playedCards,
    },
    nowIso: clock.now().toISOString(),
  });
  return advanceIfNeeded({ gameRepository, clock }, code, persisted);
}

// 카드 내기: 규칙은 도메인이 판정, 저장·공개 갱신·자동 진행만 여기서 한다
export async function playCards(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, user, cards, version },
) {
  const ctx = await loadPlayContext(gameRepository, { code, user, version });
  return executePlay({ gameRepository, clock }, { ctx, cards, code });
}

// 서버 내부용 내기: 좌석 번호로 직접 실행한다 (봇·타이머 대행용)
export async function playCardsAsSeat(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, seat, cards, version },
) {
  const ctx = await loadPlayContext(gameRepository, { code, seat, version });
  return executePlay({ gameRepository, clock }, { ctx, cards, code });
}

async function executePass({ gameRepository, clock }, { ctx, code }) {
  const nextState = pass(ctx.state, String(ctx.seat));
  const persisted = await persistAction({
    gameRepository,
    game: ctx.game,
    publicState: ctx.publicState,
    trick: ctx.trick,
    state: nextState,
    row: {
      turnNo: ctx.trick.plays.length + 1,
      seat: ctx.seat,
      action: 'pass',
      cards: [],
    },
    nowIso: clock.now().toISOString(),
  });
  return advanceIfNeeded({ gameRepository, clock }, code, persisted);
}

// 패스: 차례·패스 가능 판정은 도메인 몫, 트릭 종료 자동 진행은 서버 몫 (결정 96)
export async function passTurn(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, user, version },
) {
  const ctx = await loadPlayContext(gameRepository, { code, user, version });
  return executePass({ gameRepository, clock }, { ctx, code });
}

// 서버 내부용 패스: 좌석 번호로 직접 실행한다 (봇·타이머 대행용)
export async function passTurnAsSeat(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, seat, version },
) {
  const ctx = await loadPlayContext(gameRepository, { code, seat, version });
  return executePass({ gameRepository, clock }, { ctx, code });
}
