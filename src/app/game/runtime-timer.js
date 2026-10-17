import { createTurnTimer } from './timer-turn.js';
import { createTurnExpiryHandler } from './timer-substitutions.js';

// 예약 포트 기본값: 서버 프로세스 타이머 (결정 90)
const defaultScheduler = {
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (handle) => clearTimeout(handle),
};

export const resolveScheduler = (scheduler) => scheduler ?? defaultScheduler;

// 방별 타이머: 같은 차례(version+seat)에는 다시 걸지 않는다 (조회로 연장 금지)
export function createRoomTimer(scheduler, onExpire) {
  const onTimerExpire = (code, seat, ver) =>
    onExpire(code, { seat, version: ver }, ver);
  const timer = createTurnTimer({ clock: scheduler, onExpire: onTimerExpire });
  let lastKey = null;

  function cancel() {
    lastKey = null;
    timer.cancel();
  }

  function arm(code, version, seat) {
    const key = `${version}:${seat}`;
    if (key === lastKey) return false;
    lastKey = key;
    timer.start(code, seat, version);
    return true;
  }

  return { arm, cancel };
}

const noop = () => {};

function enqueue(state, code, task) {
  const prev = state.chains.get(code) ?? Promise.resolve();
  const next = prev.then(task, task);
  state.chains.set(code, next.then(noop, noop));
  return next;
}

function timerOf(state, code) {
  if (!state.rooms.has(code)) {
    state.rooms.set(code, createRoomTimer(state.timerClock, state.onExpire));
  }
  return state.rooms.get(code);
}

function cancelRoom(state, code) {
  state.rooms.get(code)?.cancel();
  state.rooms.delete(code);
  state.chains.delete(code);
}

function dispose(state) {
  for (const room of state.rooms.values()) room.cancel();
  state.rooms.clear();
  state.chains.clear();
}

// 방별 상태(타이머·실행 체인): 같은 방 작업은 순서대로 실행한다
export function createRoomRegistry({ scheduler, onExpire }) {
  const state = {
    rooms: new Map(),
    chains: new Map(),
    timerClock: resolveScheduler(scheduler),
    onExpire,
  };
  return {
    enqueue: (code, task) => enqueue(state, code, task),
    timerOf: (code) => timerOf(state, code),
    cancelRoom: (code) => cancelRoom(state, code),
    dispose: () => dispose(state),
  };
}

// 만료: 현재 차례와 버전이 맞을 때만 대행 표시 후 봇을 실행한다 (ADR-0015)
export function createExpiry({ gameRepository, substitutions, runBotTurn }) {
  const expire = createTurnExpiryHandler({
    substitutions,
    runBotTurn: (code) =>
      runBotTurn({ gameRepository, substitutions }, { code }),
  });

  return async function onExpire(code, target, versionArg) {
    const isObj = typeof target === 'object' && target !== null;
    const seat = isObj ? target.seat : target;
    const version = isObj ? target.version : versionArg;
    const agg = await gameRepository.findGameByCode(code);
    if (!agg || agg.game.phase !== 'playing') return false;
    if (agg.publicState.currentTurnSeat !== seat) return false;
    if (version !== undefined && agg.game.version !== version) return false;
    await expire(code, seat, version);
    return true;
  };
}
