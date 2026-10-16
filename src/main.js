import { loadConfig } from './infra/config/env.js';
import { createSupabaseServerClient } from './infra/supabase-server-client.js';
import { createSupabaseGameRepository } from './infra/game/supabase-game-repository.js';
import { createSupabaseTokenVerifier } from './infra/auth/supabase-token-verifier.js';
import { requireAuth } from './ui/http/require-auth.js';
import { createGameRouter } from './ui/game/router.js';
import { createApp } from './ui/server.js';

// 런타임 모듈이 아직 없어도 서버는 그대로 뜬다 (미주입 시 기존 동작)
async function createRuntime(deps) {
  try {
    const mod = await import('./app/game/runtime-controller.js');
    return mod.createGameRuntime(deps);
  } catch (err) {
    if (err?.code === 'ERR_MODULE_NOT_FOUND') return undefined;
    throw err;
  }
}

// 저장소·인증·시계 묶음: 두 조립 함수가 같은 부품으로 만든다
function baseDeps(config) {
  const client = createSupabaseServerClient({
    url: config.publicConfig.supabaseUrl,
    secretKey: config.getSecretKey(),
  });
  const repository = createSupabaseGameRepository({ client });
  const tokenVerifier = createSupabaseTokenVerifier({ client });
  const authMiddleware = requireAuth({ tokenVerifier });
  return { repository, clock: { now: () => new Date() }, authMiddleware };
}

// 기존 계약: 동기적으로 Express app 반환 (runtime은 선택 주입)
export function buildApp({ config, runtime } = {}) {
  const { repository, clock, authMiddleware } = baseDeps(config);
  const gameRouter = createGameRouter({
    repository,
    clock,
    rng: { random: Math.random },
    requireAuth: authMiddleware,
    runtime,
  });
  return createApp({ config, gameRouter });
}

// 실제 런타임 배선: 같은 저장소·시계를 런타임과 라우터가 공유한다
export async function buildAppWithRuntime({ config }) {
  const { repository, clock, authMiddleware } = baseDeps(config);
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
  const gameRouter = createGameRouter({
    repository,
    clock,
    rng: { random: Math.random },
    requireAuth: authMiddleware,
    runtime,
  });
  return { app: createApp({ config, gameRouter }), runtime };
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

const isMain = process.argv[1] && process.argv[1].endsWith('src/main.js');
if (isMain) {
  await startApp();
}
