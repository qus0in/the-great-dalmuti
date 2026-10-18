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

export const errorText = (err) => err.title || err.detail || err.message;

export function announceRound(publicState, result, notify) {
  const text = rankingText(result);
  if (text) notify(text);
  else if (publicState?.phase === 'finished') notify('라운드 종료');
}

export { createStartedRoom } from './play-lobby.js';

export { connectRoomChat, connectPlayChat } from './play-chat.js';
export const createTokenGetter = (client) => () =>
  client.auth
    .getSession()
    .then(({ data }) => data.session?.access_token ?? null);

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
