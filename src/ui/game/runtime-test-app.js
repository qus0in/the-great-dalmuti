import express from 'express';
import { createInMemoryGameRepository } from '../../app/game/fakes/in-memory-game-repository.js';
import { errorMiddleware } from '../http/error-middleware.js';
import { createGameRouter } from './router.js';
import { fakeRequireAuth } from './test-app.js';

// 가짜 런타임: 호출 방 코드를 기록하고 최신 공개 상태를 덧씌워 돌려준다
export function fakeRuntime() {
  const calls = [];
  return {
    calls,
    afterAction: (code, result) => {
      calls.push(code);
      return Promise.resolve({
        ...result,
        publicState: { ...result.publicState, progressed: true },
      });
    },
  };
}

// 런타임 주입 테스트 앱: 실제 HTTP + 가짜 저장소 + 가짜 인증
export async function startRuntimeApp({ runtime, repository } = {}) {
  const repo = repository ?? createInMemoryGameRepository();
  const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
  const rng = { random: () => 0.5, generateJoinCode: () => 'ROOM01' };
  const app = express();
  app.use(
    createGameRouter({
      repository: repo,
      clock,
      rng,
      requireAuth: fakeRequireAuth,
      runtime,
    }),
  );
  app.use(errorMiddleware);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const { port } = server.address();
  return {
    repository: repo,
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections?.();
      }),
  };
}
