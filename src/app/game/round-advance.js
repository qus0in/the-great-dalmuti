import { loadEndedContext } from './round-support.js';
import { persistAdvance, runAdvanceStep } from './round-finish.js';

const DEFAULT_CLOCK = { now: () => new Date() };

// 트릭 종료 후 다음 단계로: 승자 리드·아웃 기록·라운드 종료·순위
// (조공은 U6, 전적 기록은 U9 — 반환 신호로만 전달)
export async function advanceAfterTrick(
  { gameRepository, clock = DEFAULT_CLOCK },
  { code },
) {
  const ctx = await loadEndedContext(gameRepository, code);
  const done = !ctx.state || ctx.state.status === 'in-progress';
  if (ctx.game.phase !== 'playing' || done) return { advanced: false };
  const step = await runAdvanceStep({ ...ctx, gameRepository });
  const persisted = await persistAdvance({
    ...ctx,
    gameRepository,
    roundEnded: step.roundEnded,
    turnSeat: step.turnSeat,
    nowIso: clock.now().toISOString(),
  });
  const { roundEnded, rankings } = step;
  return { advanced: true, roundEnded, rankings, ...persisted };
}
