import { loadConfig } from './infra/config/env.js';
import { createSupabaseServerClient } from './infra/supabase-server-client.js';
import { createSupabaseGameRepository } from './infra/game/supabase-game-repository.js';
import { createSupabaseTokenVerifier } from './infra/auth/supabase-token-verifier.js';
import { requireAuth } from './ui/http/require-auth.js';
import { createGameRouter } from './ui/game/router.js';
import { createApp } from './ui/server.js';

// 조립 순서: 설정 → 서버 클라이언트 → 저장소·토큰 검증 → 인증 → 게임 라우터 → 앱
export function buildApp({ config }) {
  const client = createSupabaseServerClient({
    url: config.publicConfig.supabaseUrl,
    secretKey: config.getSecretKey(),
  });
  const repository = createSupabaseGameRepository({ client });
  const tokenVerifier = createSupabaseTokenVerifier({ client });
  const authMiddleware = requireAuth({ tokenVerifier });
  const gameRouter = createGameRouter({
    repository,
    clock: { now: () => new Date() },
    rng: { random: Math.random },
    requireAuth: authMiddleware,
  });
  return createApp({ config, gameRouter });
}

export function startApp(port = Number(process.env.PORT) || 3000) {
  const config = loadConfig();
  const app = buildApp({ config });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      // eslint-disable-next-line no-console
      console.log(`Server listening on port ${actualPort}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

const isMain = process.argv[1] && process.argv[1].endsWith('src/main.js');
if (isMain) {
  await startApp();
}
