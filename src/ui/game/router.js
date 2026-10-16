import express from 'express';
import {
  createRoomHandler,
  getRoomHandler,
  joinRoomHandler,
  startGameHandler,
} from './handlers-room.js';
import {
  passHandler,
  playCardsHandler,
  revolutionHandler,
  tributeHandler,
} from './handlers-play.js';

// 깨진 JSON 본문(body-parser SyntaxError)도 zod 실패처럼 400으로 흐르게 한다
// eslint-disable-next-line max-params -- Express 에러 미들웨어는 4-인자 시그니처가 필요하다
function parseErrorToValidation(err, _req, _res, next) {
  if (err?.type === 'entity.parse.failed') {
    const invalid = new SyntaxError('Invalid JSON body');
    invalid.code = 'VALIDATION_ERROR';
    return next(invalid);
  }
  return next(err);
}

// 게임 명령 JSON API 라우터. 앱에 그대로 use()하면 /api/rooms 아래 경로가 열린다.
export function createGameRouter({ repository, clock, rng, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);
  router.use(express.json());
  router.use(parseErrorToValidation);

  router.post('/api/rooms', createRoomHandler({ repository, clock, rng }));
  router.post('/api/rooms/:code/join', joinRoomHandler({ repository, clock }));
  router.get('/api/rooms/:code', getRoomHandler({ repository }));
  router.post(
    '/api/rooms/:code/start',
    startGameHandler({ repository, clock, rng }),
  );
  router.post(
    '/api/rooms/:code/plays',
    playCardsHandler({ repository, clock }),
  );
  router.post('/api/rooms/:code/pass', passHandler({ repository, clock }));
  router.post(
    '/api/rooms/:code/tribute',
    tributeHandler({ repository, clock }),
  );
  router.post(
    '/api/rooms/:code/revolution',
    revolutionHandler({ repository, clock }),
  );
  return router;
}
