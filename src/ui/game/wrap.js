// Express 핸들러 래퍼: async 오류를 next(err)로 넘긴다
export function wrap(handler) {
  return async function wrapped(req, res, next) {
    try {
      await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}
