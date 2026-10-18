import express from 'express';
import { createAdminActions } from '../app/admin/admin-actions-service.js';
import { createAdminService } from '../app/admin/admin-service.js';

function tokenFrom(req) {
  const value = req.headers.authorization;
  return typeof value === 'string' && value.startsWith('Bearer ')
    ? value.slice(7)
    : null;
}

function send(res, result) {
  return res.status(result.status).json(result.body);
}

function endpoint(work) {
  return async (req, res, next) => {
    try {
      return send(res, await work(req));
    } catch (error) {
      return next(error);
    }
  };
}

function registerReadRoutes(router, service) {
  router.get(
    '/queue',
    endpoint((req) => service.queue(tokenFrom(req))),
  );
  router.get(
    '/users',
    endpoint((req) => service.users(tokenFrom(req), req.query.q ?? '')),
  );
  router.get(
    '/history',
    endpoint((req) => service.history(tokenFrom(req))),
  );
}

function registerActionRoutes(router, actions) {
  router.post(
    '/users/:id/violation',
    endpoint((req) =>
      actions.violate(tokenFrom(req), req.authUser.id, req.params.id),
    ),
  );
  router.post(
    '/users/:id/confirm',
    endpoint((req) => actions.confirm(tokenFrom(req), req.params.id)),
  );
  router.post(
    '/users/:id/lift',
    endpoint((req) => actions.lift(tokenFrom(req), req.params.id, req.body)),
  );
  router.post(
    '/appeals/:id/upheld',
    endpoint((req) => actions.uphold(tokenFrom(req), req.params.id)),
  );
}

function requireAdmin(service) {
  return async (req, res, next) => {
    const result = await service.authorize(tokenFrom(req));
    return result.status === 200 ? next() : send(res, result);
  };
}

export function createAdminRouter({ repository, requireAuth }) {
  const router = express.Router();
  const service = createAdminService(repository);
  router.use(express.json(), requireAuth, requireAdmin(service));
  registerReadRoutes(router, service);
  registerActionRoutes(router, createAdminActions(repository));
  return router;
}
