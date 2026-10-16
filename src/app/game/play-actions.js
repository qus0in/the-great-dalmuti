import { pass, play } from '../../domain/game/trick.js';
import { persistAction } from './play-commit.js';
import {
  loadPlayContext,
  removeCards,
  resolveHandCards,
} from './play-shared.js';

const DEFAULT_CLOCK = { now: () => new Date() };

// 내기 실행 본체: 사용자 경로·좌석 지정 경로가 공유한다 (읽기만 하고 새 손패로 저장)
async function executePlay({ gameRepository, clock }, ctx, cards) {
  const playedCards = resolveHandCards(ctx.hands[ctx.seat], cards);
  const nextState = play(ctx.state, String(ctx.seat), playedCards);
  const nextHands = {
    ...ctx.hands,
    [ctx.seat]: removeCards(ctx.hands[ctx.seat], playedCards),
  };
  await gameRepository.saveHands(ctx.game.id, nextHands);
  return persistAction({
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
}

// 카드 내기: 규칙은 도메인이 판정, 저장·공개 갱신만 여기서 한다
export async function playCards(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, user, cards, version },
) {
  const ctx = await loadPlayContext(gameRepository, { code, user, version });
  return executePlay({ gameRepository, clock }, ctx, cards);
}

// 서버 내부용 내기: 좌석 번호로 직접 실행한다 (봇·타이머 대행용)
export async function playCardsAsSeat(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, seat, cards, version },
) {
  const ctx = await loadPlayContext(gameRepository, { code, seat, version });
  return executePlay({ gameRepository, clock }, ctx, cards);
}

// 패스 실행 본체: 사용자 경로·좌석 지정 경로가 공유한다
function executePass({ gameRepository, clock }, ctx) {
  const nextState = pass(ctx.state, String(ctx.seat));
  return persistAction({
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
}

// 패스: 차례·패스 가능 판정은 도메인 몫, 트릭 종료는 신호로만 반환 (U5 몫)
export async function passTurn(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, user, version },
) {
  const ctx = await loadPlayContext(gameRepository, { code, user, version });
  return executePass({ gameRepository, clock }, ctx);
}

// 서버 내부용 패스: 좌석 번호로 직접 실행한다 (봇·타이머 대행용)
export async function passTurnAsSeat(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, seat, version },
) {
  const ctx = await loadPlayContext(gameRepository, { code, seat, version });
  return executePass({ gameRepository, clock }, ctx);
}
