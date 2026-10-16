import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createTurnTimer, TURN_TIMEOUT_MS } from './timer-turn.js';

// 가짜 예약 포트: 예약을 모아 두고 fireAll로 만료를 일으킨다
function fakeScheduler() {
  const jobs = new Map();
  let lastMs = null;
  let id = 0;
  return {
    clock: {
      setTimer(fn, ms) {
        id += 1;
        jobs.set(id, fn);
        lastMs = ms;
        return id;
      },
      clearTimer(handle) {
        jobs.delete(handle);
      },
    },
    lastMs: () => lastMs,
    fireAll() {
      const pending = [...jobs.values()];
      jobs.clear();
      for (const fn of pending) fn();
    },
  };
}

function timerWith(sched) {
  const expired = [];
  const timer = createTurnTimer({
    clock: sched.clock,
    onExpire: (code, seat) => expired.push([code, seat]),
  });
  return { timer, expired };
}

describe('Turn timer scheduling', () => {
  it('Given turn started, When action cancels, Then no expiry', () => {
    const sched = fakeScheduler();
    const { timer, expired } = timerWith(sched);

    timer.start('ABCD12', 1);
    timer.cancel();
    sched.fireAll();

    assert.deepEqual(expired, []);
  });

  it('Given turn started, When timer fires, Then onExpire with code and seat', () => {
    const sched = fakeScheduler();
    const { timer, expired } = timerWith(sched);

    timer.start('ABCD12', 2);
    sched.fireAll();

    assert.deepEqual(expired, [['ABCD12', 2]]);
  });
});

describe('Turn timer timeout value', () => {
  it('Given default and custom, When scheduled, Then each timeout applies', () => {
    const sched = fakeScheduler();
    const defaultTimer = createTurnTimer({
      clock: sched.clock,
      onExpire() {},
    });
    const customTimer = createTurnTimer({
      clock: sched.clock,
      onExpire() {},
      timeoutMs: 1000,
    });

    defaultTimer.start('ABCD12', 0);
    assert.equal(sched.lastMs(), TURN_TIMEOUT_MS);
    customTimer.start('ABCD12', 1);
    assert.equal(sched.lastMs(), 1000);
  });

  it('Given restarted turn, When fires, Then only latest turn expires', () => {
    const sched = fakeScheduler();
    const { timer, expired } = timerWith(sched);

    timer.start('ABCD12', 0);
    timer.start('ABCD12', 1);
    sched.fireAll();

    assert.deepEqual(expired, [['ABCD12', 1]]);
  });
});
