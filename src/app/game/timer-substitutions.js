// 봇 대행 상태 — 서버 프로세스 메모리에 둔다
// (재시작 시 진행 판 폐기(ADR-0001 확정 10)와 일관, 저장 포트·칼럼 불필요)
export function createSubstitutions() {
  const byCode = new Map();

  function seatsOf(code) {
    if (!byCode.has(code)) byCode.set(code, new Set());
    return byCode.get(code);
  }

  return {
    mark(code, seat) {
      seatsOf(code).add(seat);
    },
    // 복귀: 다음 차례 시작 시점부터 반영된다 — 대행 여부는 차례 시작 때만 판정
    // (봇이 처리 중인 차례는 끝까지 — ADR-0001 확정 11)
    unmark(code, seat) {
      seatsOf(code).delete(seat);
    },
    isSubstituted(code, seat) {
      return seatsOf(code).has(seat);
    },
    // 판 종료 시 전적 제외 입력(U9 substitutedUserIds)으로 쓰는 좌석 목록
    seatsIn(code) {
      return [...seatsOf(code)];
    },
  };
}

// 만료 처리: 좌석을 대행으로 표시하고 봇 차례를 실행한다
// (runBotTurn은 U7에서 주입 — 경계 유지, 시그니처 제안: (code, seat))
export function createTurnExpiryHandler({ substitutions, runBotTurn }) {
  return function onExpire(code, seat) {
    substitutions.mark(code, seat);
    return runBotTurn(code, seat);
  };
}
