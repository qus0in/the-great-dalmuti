import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, 'public');

export function createApp({ config } = {}) {
  const app = express();
  app.use(express.static(PUBLIC_DIR));

  app.get('/api/config', (_req, res) => {
    const publicConfig = config?.publicConfig ?? {
      supabaseUrl: process.env.SUPABASE_URL,
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    };
    res.set('Cache-Control', 'public, max-age=300');
    res.json(publicConfig);
  });

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
