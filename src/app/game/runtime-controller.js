import { runBotTurn } from './bot-turn.js';
import { createSubstitutions } from './timer-substitutions.js';
import { createExpiry, createRoomRegistry } from './runtime-timer.js';
import { createProgress } from './runtime-progress.js';
import { createStatsRecorder } from './runtime-stats.js';

const defaultClock = { now: () => new Date() };
const noop = () => {};

function buildRuntime({
  gameRepository,
  clock,
  scheduler,
  onError,
  substitutions,
}) {
  const base = { gameRepository, substitutions, onError };
  const recordStats = createStatsRecorder({ ...base, clock });
  const expiry = createExpiry({ ...base, runBotTurn });
  const rooms = createRoomRegistry({
    scheduler,
    onExpire: (code, seat) =>
      rooms.enqueue(code, () => progress.expire(code, seat)),
  });
  const progress = createProgress({ ...base, recordStats, expiry, rooms });
  return {
    afterAction: (code, result = {}) => {
      substitutions.clearLastSubstitution?.(code);
      return rooms.enqueue(code, () => progress.step(code, result));
    },
    cancelRoom: (code) => {
      substitutions.clearLastSubstitution?.(code);
      return rooms.cancelRoom(code);
    },
    dispose: rooms.dispose,
    getLastSubstitution: (code) =>
      substitutions.getLastSubstitution?.(code) ?? null,
  };
}

// 게임 런타임: 명령 성공 후 봇·대행을 사람 차례까지 진행하고 30초 타이머를 관리한다
export function createGameRuntime({
  gameRepository,
  clock = defaultClock,
  scheduler,
  onError = noop,
  substitutions = createSubstitutions(),
}) {
  return buildRuntime({
    gameRepository,
    clock,
    scheduler,
    onError,
    substitutions,
  });
}
