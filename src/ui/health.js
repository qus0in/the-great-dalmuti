export const HEALTH_PATH = '/healthz';
export const HEALTH_RESPONSE = Object.freeze({ status: 'ok' });

export function healthHandler(req, res) {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }
  return res.status(200).json(HEALTH_RESPONSE);
}

export function registerHealth(app) {
  if (!app || typeof app.get !== 'function') {
    throw new Error('App instance is required');
  }
  app.get(HEALTH_PATH, healthHandler);
  if (typeof app.head === 'function') {
    app.head(HEALTH_PATH, healthHandler);
  }
  return app;
}

export const check = healthHandler;
