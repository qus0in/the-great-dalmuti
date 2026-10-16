const DEFAULT_TIMEOUT_MS = 30000;

// 예약 포트 기본값: 서버 프로세스 타이머 (결정 90)
const defaultClock = {
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (handle) => clearTimeout(handle),
};

// 차례 타이머: 차례 시작 시 예약, 행동 시 해제, 만료 시 onExpire(code, seat)
// (30초는 자기 차례 시작부터 — ADR-0001 확정 9)
export function createTurnTimer({
  clock = defaultClock,
  onExpire,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  let handle = null;

  function cancel() {
    if (handle !== null) clock.clearTimer(handle);
    handle = null;
  }

  function start(code, seat) {
    cancel();
    handle = clock.setTimer(() => {
      handle = null;
      onExpire(code, seat);
    }, timeoutMs);
  }

  return { start, cancel };
}

export const TURN_TIMEOUT_MS = DEFAULT_TIMEOUT_MS;
