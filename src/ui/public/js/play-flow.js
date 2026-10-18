// 명령 응답의 rankings와 공개 좌석 이름으로 라운드 종료 문구를 만든다 (없으면 null)
export function rankingText(result) {
  const rankings = result && result.rankings;
  if (!rankings || rankings.length === 0) return null;
  const summary = (result.publicState && result.publicState.seatSummary) || [];
  const texts = rankings.map((r, index) => {
    const seat = Number(r.playerId);
    const found = summary.find((s) => s.seat === seat);
    const name = (found && found.userName) || `좌석 ${seat}`;
    return `${index + 1}위 ${r.rank} ${name}`;
  });
  return `라운드 종료 — ${texts.join(', ')}`;
}

export function errorText(err) {
  return err.title || err.detail || err.message;
}

export function announceRound(publicState, result, notify) {
  const text = rankingText(result);
  if (text) notify(text);
  else if (publicState?.phase === 'finished') notify('라운드 종료');
}

export async function createStartedRoom(api, user, search) {
  const options = /(?:^|[?&])mode=tutorial(?:&|$)/.test(search)
    ? { mode: 'tutorial' }
    : undefined;
  const created = await api.createRoom(options);
  const { joinCode } = created.game;
  const mine = created.seats.find((seat) => seat.userId === user.id);
  await api.startGame(joinCode);
  const room = await api.getRoom(joinCode);
  return { joinCode, room, seat: mine ? mine.seat : 0 };
}

// supabase-js 세션에서 매 요청마다 액세스 토큰을 읽는 함수를 만든다
export function createTokenGetter(client) {
  return async () => {
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
  };
}

// play-state가 응답을 버리므로 마지막 명령 응답을 기록하는 api 래퍼를 만든다
export function withRecorder(base, onResult) {
  const record =
    (fn) =>
    async (...args) => {
      const result = await fn(...args);
      onResult(result);
      return result;
    };
  return {
    ...base,
    playCards: record(base.playCards),
    pass: record(base.pass),
  };
}
