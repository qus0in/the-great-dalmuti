import { createGameApi } from './game-api.js';
import { createHttpClient } from './http-client.js';
import { createTokenGetter, withRecorder } from './play-flow.js';

export function createPlayApi({ client, axios, onResult }) {
  const http = createHttpClient({ axios, getToken: createTokenGetter(client) });
  return withRecorder(createGameApi(http), onResult);
}
