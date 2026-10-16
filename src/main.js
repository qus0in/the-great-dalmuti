import { loadConfig } from './infra/config/env.js';
import { createApp } from './ui/server.js';

export function startApp(port = Number(process.env.PORT) || 3000) {
  const config = loadConfig();
  const app = createApp({ config });

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
