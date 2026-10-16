import express from 'express';
import { createInMemoryGameRepository } from '../../app/game/fakes/in-memory-game-repository.js';
import { errorMiddleware } from '../http/error-middleware.js';
import { createGameRouter } from './router.js';

// 테스트용 인증 미들웨어: x-user-id 헤더로 req.authUser를 주입한다
export function fakeRequireAuth(req, _res, next) {
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

// 라우터 + 가짜 저장소 + 에러 미들웨어를 실제 HTTP 서버로 띄운다
export async function startTestApp() {
  const repository = createInMemoryGameRepository();
  const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
  const rng = { random: () => 0.5, generateJoinCode: () => 'ROOM01' };
  const app = express();
  app.use(
    createGameRouter({ repository, clock, rng, requireAuth: fakeRequireAuth }),
  );
  app.use(errorMiddleware);
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

// JSON 요청 헬퍼: 상태·Content-Type·본문을 함께 돌려준다
export async function call(
  baseUrl,
  path,
  { method = 'GET', userId, body, raw } = {},
) {
  const headers = { 'content-type': 'application/json' };
  if (userId) headers['x-user-id'] = userId;
  const payload =
    raw ?? (body === undefined ? undefined : JSON.stringify(body));
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: payload,
  });
  const json = await res.json().catch(() => null);
  return {
    status: res.status,
    contentType: res.headers.get('content-type') ?? '',
    body: json,
  };
}
