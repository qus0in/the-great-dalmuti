import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSubstitutions,
  createTurnExpiryHandler,
} from './timer-substitutions.js';

// 만료 처리: 대행 표시 + 봇 실행 + 차례 종료 시 1턴 한정 해제 + 마지막 대행 기록 (ADR-0015)
describe('Turn expiry handler', () => {
  it('Given expired turn, When handler runs, Then seat marked during run and unmarked after, recording last substitution', async () => {
    const substitutions = createSubstitutions();
    const botCalls = [];
    let markedDuringBot = null;
    const onExpire = createTurnExpiryHandler({
      substitutions,
      runBotTurn: (code, seat) => {
        botCalls.push([code, seat]);
        markedDuringBot = substitutions.isSubstituted(code, seat);
        return { acted: true, action: 'play' };
      },
    });

    await onExpire('ABCD12', 3);

    assert.equal(markedDuringBot, true);
    assert.equal(substitutions.isSubstituted('ABCD12', 3), false);
    assert.deepEqual(substitutions.seatsIn('ABCD12'), [3]);
    assert.deepEqual(substitutions.getLastSubstitution('ABCD12'), {
      seat: 3,
      action: 'play',
    });
    assert.deepEqual(botCalls, [['ABCD12', 3]]);
  });
});

// 복귀(ADR-0015): unmark는 해당 차례 대행만 해제. 전적 제외(ADR-0004)를 위한 seatsIn 누적 목록은 보존.
describe('Substitution return and U9 input', () => {
  it('Given substituted seats, When original returns, Then active unmarks but cumulative seatsIn remains', () => {
    const substitutions = createSubstitutions();
    substitutions.mark('ABCD12', 1);
    substitutions.mark('ABCD12', 3);
    substitutions.mark('WXYZ99', 0);

    assert.deepEqual(substitutions.seatsIn('ABCD12'), [1, 3]);
    substitutions.unmark('ABCD12', 1);
    assert.equal(substitutions.isSubstituted('ABCD12', 1), false);
    assert.deepEqual(substitutions.seatsIn('ABCD12'), [1, 3]);
    assert.deepEqual(substitutions.seatsIn('WXYZ99'), [0]);
  });
});
