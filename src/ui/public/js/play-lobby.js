import { hideLobby, renderLobby } from './play-lobby-view.js';

function seatFor(room, userId) {
  return room.publicState?.seatSummary?.find((seat) => seat.userId === userId);
}
function isNotSeated(err) {
  return err.status === 403 || err.code === 'FORBIDDEN';
}
async function loadCodeRoom(api, code, user) {
  let room;
  let mine;
  try {
    room = await api.getRoom(code);
    mine = seatFor(room, user.id);
  } catch (err) {
    if (!isNotSeated(err)) throw err;
  }
  if (!mine) {
    const joined = await api.joinRoom(code);
    mine = { seat: joined.seat };
    room = await api.getRoom(code);
  }
  return { room, seat: seatFor(room, user.id)?.seat ?? mine.seat };
}

function roomCode(search) {
  const match = /(?:^|[?&])code=([^&]*)/.exec(search || '');
  return match ? decodeURIComponent(match[1]) : null;
}
async function createRoom(api, user, { tutorial, replaceUrl }) {
  const created = await api.createRoom(
    tutorial ? { mode: 'tutorial' } : undefined,
  );
  const { joinCode } = created.game;
  const seat = created.seats.find((item) => item.userId === user.id)?.seat ?? 0;
  if (tutorial) await api.startGame(joinCode);
  else replaceUrl?.(`/play?code=${encodeURIComponent(joinCode)}`);
  const room = await api.getRoom(joinCode);
  return { joinCode, room, seat, isTutorial: tutorial };
}
export async function prepareRoom(api, user, input = '') {
  const search = typeof input === 'string' ? input : input.search;
  const replaceUrl = typeof input === 'string' ? undefined : input.replaceUrl;
  const tutorial = /(?:^|[?&])mode=tutorial(?:&|$)/.test(search || '');
  const code = roomCode(search);
  if (code && !tutorial) {
    const joined = await loadCodeRoom(api, code, user);
    return { joinCode: code, ...joined, isTutorial: false };
  }
  return createRoom(api, user, { tutorial, replaceUrl });
}
export const createStartedRoom = prepareRoom;

export function createLobbyState({ code, publicState, mySeat, origin = '' }) {
  const { seatSummary = [] } = publicState || {};
  const base = origin.replace(/\/$/, '');
  return {
    code,
    link: `${base}/play?code=${encodeURIComponent(code)}`,
    isHost: mySeat === 0,
    seats: seatSummary.map(({ seat, userName, userId, isBot }) => ({
      seat,
      userName,
      userId,
      isBot: Boolean(isBot),
    })),
    canStart: mySeat === 0 && publicState?.phase === 'waiting',
  };
}
export const startLobbyRoom = (api, code) =>
  api.startGame(code).then(() => api.getRoom(code));
export const startWaitingRoom = (api, state) => {
  const { code } = state.get();
  return startLobbyRoom(api, code).then((room) =>
    state.setRoom({ code, ...room }),
  );
};

export function renderWaitingRoom(doc, view, options) {
  const { mySeat, origin, onStart } = options;
  const waiting = view.publicState?.phase === 'waiting';
  for (const selector of [
    '.play-arena',
    '.play-hand-area',
    '[data-play="banner"]',
    '[data-play="substitution"]',
  ]) {
    const item = doc.querySelector(selector);
    if (item) item.hidden = waiting;
  }
  if (!waiting) return hideLobby(doc);
  const lobby = createLobbyState({
    code: view.code,
    publicState: view.publicState,
    mySeat,
    origin,
  });
  return renderLobby(doc, lobby, { onCopy: () => {}, onStart });
}
