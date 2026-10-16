import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createSubstitutions,
  createTurnExpiryHandler,
} from './timer-substitutions.js';

// 만료 처리: 대행 표시 + 봇 실행 (runBotTurn은 U7 경계 — 가짜 주입)
describe('Turn expiry handler', () => {
  it('Given expired turn, When handler runs, Then seat marked and bot runs', () => {
    const substitutions = createSubstitutions();
    const botCalls = [];
    const onExpire = createTurnExpiryHandler({
      substitutions,
      runBotTurn: (code, seat) => botCalls.push([code, seat]),
    });

    onExpire('ABCD12', 3);

    assert.equal(substitutions.isSubstituted('ABCD12', 3), true);
    assert.deepEqual(botCalls, [['ABCD12', 3]]);
  });
});

// 복귀(ADR-0001 확정 11): unmark는 차례 시작 판정에서만 읽히므로 다음 차례부터 반영.
// 여기서는 상태 전이와 U9 입력 좌석 목록을 검증한다.
describe('Substitution return and U9 input', () => {
  it('Given substituted seats, When original returns, Then marks update', () => {
    const substitutions = createSubstitutions();
    substitutions.mark('ABCD12', 1);
    substitutions.mark('ABCD12', 3);
    substitutions.mark('WXYZ99', 0);

    assert.deepEqual(substitutions.seatsIn('ABCD12'), [1, 3]);
    substitutions.unmark('ABCD12', 1);
    assert.equal(substitutions.isSubstituted('ABCD12', 1), false);
    assert.deepEqual(substitutions.seatsIn('ABCD12'), [3]);
    assert.deepEqual(substitutions.seatsIn('WXYZ99'), [0]);
  });
});
