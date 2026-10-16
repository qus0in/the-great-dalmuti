import { authenticate } from '../../app/auth/authenticate.js';

// Express 미들웨어: Bearer 토큰을 검증해 req.authUser에 담는다 (실패는 에러 미들웨어가 401로 매핑)
export function requireAuth({ tokenVerifier }) {
  return async function authMiddleware(req, _res, next) {
    try {
      // eslint-disable-next-line no-param-reassign -- Express 요청 확장 관례
      req.authUser = await authenticate(
        { tokenVerifier },
        req.headers.authorization,
      );
      next();
    } catch (err) {
      next(err);
    }
  };
}
