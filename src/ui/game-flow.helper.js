import { createApp } from './server.js';
import { createGameRouter } from './game/router.js';
import { createInMemoryGameRepository } from '../app/game/fakes/in-memory-game-repository.js';

export const USERS = ['u0', 'u1', 'u2', 'u3'];
export const JOIN_CODE = 'ROOM01';

function fakeRequireAuth(req, _res, next) {
  const id = req.headers['x-user-id'];
  if (!id) {
    const err = new Error('Authentication required');
    err.name = 'AuthenticationError';
    err.code = 'UNAUTHENTICATED';
    return next(err);
  }
  // eslint-disable-next-line no-param-reassign -- Express 요청 확장 관례
  req.authUser = { id, name: id };
  return next();
}

export async function startFlowApp() {
  const repository = createInMemoryGameRepository();
  const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
  const rng = { random: () => 0.5, generateJoinCode: () => JOIN_CODE };
  const gameRouter = createGameRouter({
    repository,
    clock,
    rng,
    requireAuth: fakeRequireAuth,
  });
  const app = createApp({ gameRouter });
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const { port } = server.address();
  return {
    repository,
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections?.();
      }),
  };
}

export async function send(
  baseUrl,
  path,
  { method = 'GET', userId, body } = {},
) {
  const headers = { 'content-type': 'application/json' };
  if (userId) headers['x-user-id'] = userId;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const roomPath = (suffix) => `/api/rooms/${JOIN_CODE}${suffix}`;
const route =
  (method, suffix, defaultUser) =>
  (baseUrl, userId = defaultUser, body) =>
    send(baseUrl, roomPath(suffix), { method, userId, body });

export const createRoom = (baseUrl) =>
  send(baseUrl, '/api/rooms', { method: 'POST', userId: 'u0' });

export const joinRoom = route('POST', '/join');
export const startRoom = route('POST', '/start', 'u0');
export const getRoom = route('GET', '');
export const playCards = route('POST', '/plays');

export const passTurn = (baseUrl, userId, version) =>
  send(baseUrl, roomPath('/pass'), {
    method: 'POST',
    userId,
    body: { version },
  });

function rankGroups(hand) {
  const groups = {};
  for (const card of hand) (groups[card.rank] ??= []).push(card);
  return Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b)
    .map((rank) => groups[rank]);
}

export function chooseMove(hand, previousPlay) {
  const groups = rankGroups(hand);
  if (!previousPlay) return groups[0] ?? null;
  const found = groups.find(
    (group) =>
      group[0].rank < previousPlay.rank && group.length >= previousPlay.count,
  );
  return found?.slice(0, previousPlay.count) ?? null;
}
