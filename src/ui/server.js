import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PUBLIC_DIR = join(__dirname, 'public');

export function createApp() {
  const app = express();
  app.use(express.static(PUBLIC_DIR));
  return app;
}

export function startServer(port = Number(process.env.PORT) || 3000) {
  const app = createApp();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve(server);
    });
    server.on('error', reject);
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const server = await startServer();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : address;
  console.log(`Server listening on port ${port}`);
}
