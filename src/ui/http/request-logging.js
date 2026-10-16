import pino from 'pino';
import pinoHttp from 'pino-http';

const SUPPORTED_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
];

function assertLevel(level) {
  if (!SUPPORTED_LEVELS.includes(level)) {
    throw new RangeError(`unsupported log level: ${level}`);
  }
  return level;
}

// 쿼리스트링 제거: /api/rooms?code=X -> /api/rooms
function pathOf(req) {
  const raw = req.originalUrl ?? req.url ?? '/';
  const cut = raw.indexOf('?');
  return cut === -1 ? raw : raw.slice(0, cut);
}

// Express 요청 로깅 팩토리: pino JSON stdout, 화이트리스트만 기록한다.
// wrapSerializers:false라 아래가 원본 req/res에 직접 동작한다. 기본 std
// serializer는 쓰지 않으며, err는 키 자체를 남기지 않는다.
export function createRequestLogging({ logger, stream, level } = {}) {
  const base =
    logger ??
    pino(
      { level: assertLevel(level ?? process.env.LOG_LEVEL ?? 'info') },
      stream,
    );
  return pinoHttp({
    logger: base,
    wrapSerializers: false,
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, path: pathOf(req) }),
      res: (res) => ({ statusCode: res.statusCode }),
      err: () => undefined,
    },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  });
}
