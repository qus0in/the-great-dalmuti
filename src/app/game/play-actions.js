import { pass, play } from '../../domain/game/trick.js';
import { persistAction } from './play-commit.js';
import {
  loadPlayContext,
  removeCards,
  resolveHandCards,
} from './play-shared.js';

const DEFAULT_CLOCK = { now: () => new Date() };

// 카드 내기: 규칙은 도메인이 판정, 저장·공개 갱신만 여기서 한다
export async function playCards(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, user, cards, version },
) {
  const ctx = await loadPlayContext(gameRepository, { code, user, version });
  const playedCards = resolveHandCards(ctx.hands[ctx.seat], cards);
  const nextState = play(ctx.state, String(ctx.seat), playedCards);
  ctx.hands[ctx.seat] = removeCards(ctx.hands[ctx.seat], playedCards);
  await gameRepository.saveHands(ctx.game.id, ctx.hands);
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

// 패스: 차례·패스 가능 판정은 도메인 몫, 트릭 종료는 신호로만 반환 (U5 몫)
export async function passTurn(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code, user, version },
) {
  const ctx = await loadPlayContext(gameRepository, { code, user, version });
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
