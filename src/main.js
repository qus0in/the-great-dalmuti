import { createRuntime } from './main-runtime.js';
import { loadConfig } from './infra/config/env.js';
import { createSupabaseServerClient } from './infra/supabase-server-client.js';
import { createSupabaseGameRepository } from './infra/game/supabase-game-repository.js';
import { createSupabaseTokenVerifier } from './infra/auth/supabase-token-verifier.js';
import { requireAuth } from './ui/http/require-auth.js';
import { createReportRouterFor } from './main-reporting.js';
import { createAdminRouterFor } from './main-admin-api.js';
import { createGameRouter } from './ui/game/router.js';
import { createApp } from './ui/server.js';

const gameRouterFor = (deps, runtime) =>
  createGameRouter({
    repository: deps.repository,
    clock: deps.clock,
    rng: { random: Math.random },
    requireAuth: deps.authMiddleware,
    runtime,
  });
function baseDeps(config) {
  const client = createSupabaseServerClient({
    url: config.publicConfig.supabaseUrl,
    secretKey: config.getSecretKey(),
  });
  const repository = createSupabaseGameRepository({ client });
  const tokenVerifier = createSupabaseTokenVerifier({ client });
  const authMiddleware = requireAuth({ tokenVerifier });
  const reportRouter = createReportRouterFor(config, client, authMiddleware);
  const adminRouter = createAdminRouterFor(config, client, authMiddleware);
  return {
    repository,
    clock: { now: () => new Date() },
    authMiddleware,
    reportRouter,
    adminRouter,
  };
}
export function buildApp({ config, runtime } = {}) {
  const { repository, clock, authMiddleware, reportRouter, adminRouter } =
    baseDeps(config);
  const gameRouter = gameRouterFor(
    { repository, clock, authMiddleware },
    runtime,
  );
  return createApp({ config, gameRouter, reportRouter, adminRouter });
}

export async function buildAppWithRuntime({ config }) {
  const { repository, clock, authMiddleware, reportRouter, adminRouter } =
    baseDeps(config);
  const runtime = await createRuntime({
    gameRepository: repository,
    clock,
    scheduler: {
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (handle) => clearTimeout(handle),
    },
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.error(`[runtime] ${err?.code ?? 'ERROR'} ${err?.message ?? ''}`);
    },
  });
  const gameRouter = gameRouterFor(
    { repository, clock, authMiddleware },
    runtime,
  );
  return {
    app: createApp({ config, gameRouter, reportRouter, adminRouter }),
    runtime,
  };
}

export async function startApp(
  port = Number(process.env.PORT) || 3000,
  { runtime } = {},
) {
  const config = loadConfig();
  const built =
    runtime === undefined
      ? await buildAppWithRuntime({ config })
      : { app: buildApp({ config, runtime }), runtime };
  const { app, runtime: active } = built;
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      // eslint-disable-next-line no-console
      console.log(`Server listening on port ${actualPort}`);
      resolve(server);
    });
    server.on('error', reject);
    server.on('close', () => {
      if (active) active.dispose();
    });
  });
}

if (process.argv[1]?.endsWith('src/main.js')) await startApp();
