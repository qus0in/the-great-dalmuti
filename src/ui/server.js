import express from 'express';
import { fileURLToPath } from 'node:url';
import { registerHealth } from './health.js';
import { errorMiddleware, notFoundHandler } from './http/error-middleware.js';
import { createRequestLogging } from './http/request-logging.js';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, 'public');

function handleNotFound(req, res, next) {
  if (req.path.startsWith('/api/')) {
    notFoundHandler(req, res, next);
    return;
  }
  res.status(404).sendFile(join(PUBLIC_DIR, '404.html'));
}

function registerPublicRoutes(app, config) {
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
}

function registerApiRoutes(app, gameRouter, reportRouter) {
  if (reportRouter) app.use('/api/reports', reportRouter);
  if (gameRouter) app.use(gameRouter);
  app.use(handleNotFound);
  app.use(errorMiddleware);
}

export function createApp({
  config,
  gameRouter,
  reportRouter,
  requestLogging,
} = {}) {
  const app = express();
  app.use(requestLogging ?? createRequestLogging());
  registerHealth(app);
  registerPublicRoutes(app, config);
  registerApiRoutes(app, gameRouter, reportRouter);
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
