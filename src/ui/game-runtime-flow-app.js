import express from 'express';
import { createGameRuntime } from '../app/game/runtime-controller.js';
import { createInMemoryGameRepository } from '../app/game/fakes/in-memory-game-repository.js';
import { createFakeScheduler } from '../app/game/runtime-fixture.js';
import { createSubstitutions } from '../app/game/timer-substitutions.js';
import { errorMiddleware } from './http/error-middleware.js';
import { createGameRouter } from './game/router.js';
import { fakeRequireAuth } from './game/test-app.js';

export const CODE = 'ROOM01';

function createParts() {
  const repository = createInMemoryGameRepository();
  const scheduler = createFakeScheduler();
  const substitutions = createSubstitutions();
  const errors = [];
  const clock = { now: () => new Date('2026-10-16T12:00:00Z') };
  const runtime = createGameRuntime({
    gameRepository: repository,
    clock,
    scheduler,
    substitutions,
    onError: (err) => errors.push(err),
  });
  return { repository, scheduler, substitutions, errors, runtime, clock };
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

// 실제 app 런타임 + 가짜 저장소·가짜 예약 시계 + 가짜 인증 + 실제 HTTP listen
export async function startRuntimeFlowApp() {
  const parts = createParts();
  const app = express();
  app.use(
    createGameRouter({
      repository: parts.repository,
      clock: parts.clock,
      rng: { random: () => 0.5, generateJoinCode: () => CODE },
      requireAuth: fakeRequireAuth,
      runtime: parts.runtime,
    }),
  );
  app.use(errorMiddleware);
  const server = await listen(app);
  const { port } = server.address();
  return {
    ...parts,
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections?.();
      }),
  };
}
