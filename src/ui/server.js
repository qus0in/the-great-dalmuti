import express from 'express';
import { fileURLToPath } from 'node:url';
import { registerHealth } from './health.js';
import { errorMiddleware, notFoundHandler } from './http/error-middleware.js';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, 'public');

// 없는 주소: 화면은 404 안내 페이지, API는 Problem Details 유지
function handleNotFound(req, res, next) {
  if (req.path.startsWith('/api/')) {
    notFoundHandler(req, res, next);
    return;
  }
  res.status(404).sendFile(join(PUBLIC_DIR, '404.html'));
}

export function createApp({ config } = {}) {
  const app = express();
  registerHealth(app);
  // 파일명 없는 깔끔한 주소로 보낸다 (쿼리스트링 유지)
  app.use((req, res, next) => {
    if (req.path === '/index.html') {
      res.redirect(301, `/${req.url.slice('/index.html'.length)}`);
    } else if (req.path === '/play.html') {
      res.redirect(301, `/play${req.url.slice('/play.html'.length)}`);
    } else {
      next();
    }
  });
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

  app.get('/api/config', (_req, res) => {
    const publicConfig = config?.publicConfig ?? {
      supabaseUrl: process.env.SUPABASE_URL,
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    };
    res.set('Cache-Control', 'public, max-age=300');
    res.json(publicConfig);
  });

  // 없는 주소: 화면은 404 안내 페이지, API는 Problem Details 유지
  app.use(handleNotFound);
  app.use(errorMiddleware);

  return app;
}

export function startServer(
  portOrOptions = Number(process.env.PORT) || 3000,
  optionsConfig,
) {
  const isOptions = typeof portOrOptions === 'object' && portOrOptions !== null;
  const port = isOptions ? (portOrOptions.port ?? 3000) : portOrOptions;
  const config = isOptions ? portOrOptions.config : optionsConfig;

  const app = createApp({ config });
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.on('error', reject);
  });
}
