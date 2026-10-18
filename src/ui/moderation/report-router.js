import express from 'express';

// Convert body-parser syntax errors to the shared 400 validation response.
// eslint-disable-next-line max-params -- Express error middleware signature
function parseError(err, _req, _res, next) {
  if (err?.type === 'entity.parse.failed') {
    const invalid = new SyntaxError('Invalid JSON body');
    invalid.code = 'VALIDATION_ERROR';
    return next(invalid);
  }
  return next(err);
}

function bearerToken(req) {
  const header = req.headers.authorization;
  return typeof header === 'string' && header.startsWith('Bearer ')
    ? header.slice(7)
    : null;
}

export function createReportRouter({ requireAuth, reportUser }) {
  const router = express.Router();
  router.use(requireAuth);
  router.use(express.json());
  router.use(parseError);
  router.post('/', async (req, res, next) => {
    try {
      const result = await reportUser({
        accessToken: bearerToken(req),
        reporterId: req.authUser.id,
        targetId: req.body?.targetId,
        reason: req.body?.reason,
      });
      return res.status(result.status).json(result.body);
    } catch (err) {
      return next(err);
    }
  });
  return router;
}
