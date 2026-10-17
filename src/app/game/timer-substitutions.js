function bucket(map, code) {
  if (!map.has(code)) map.set(code, new Set());
  return map.get(code);
}

// 봇 대행 상태 — 서버 프로세스 메모리에 둔다 (ADR-0001, ADR-0015)
export function createSubstitutions() {
  const active = new Map();
  const cumulative = new Map();
  const lastSub = new Map();

  return {
    mark(code, seat) {
      bucket(active, code).add(seat);
      bucket(cumulative, code).add(seat);
    },
    unmark: (code, seat) => bucket(active, code).delete(seat),
    isSubstituted: (code, seat) => bucket(active, code).has(seat),
    seatsIn: (code) => [...bucket(cumulative, code)],
    recordSubstitution: (code, info) => lastSub.set(code, info),
    getLastSubstitution: (code) => lastSub.get(code) ?? null,
    clearLastSubstitution: (code) => lastSub.delete(code),
  };
}

// 만료 처리: 좌석을 대행으로 표시하고 봇 차례를 1회 실행한 뒤 해제한다 (ADR-0015)
export function createTurnExpiryHandler({ substitutions, runBotTurn }) {
  return async function onExpire(code, seat, version) {
    substitutions.mark(code, seat);
    try {
      const result = await runBotTurn(code, seat);
      if (result?.acted) {
        substitutions.recordSubstitution?.(code, {
          seat,
          action: result.action ?? 'play',
          ...(version !== undefined ? { version } : {}),
        });
      }
      return result;
    } finally {
      substitutions.unmark(code, seat);
    }
  };
}
