import { toProblem } from './problem-details.js';

function setResponseHeaders(res, problem) {
  if (typeof res?.status === 'function') {
    res.status(problem.status);
  }
  if (typeof res?.type === 'function') {
    res.type('application/problem+json');
  }
  if (typeof res?.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/problem+json');
  }
}

function sendProblemBody(res, problem) {
  if (typeof res?.json === 'function') {
    return res.json(problem);
  }
  if (typeof res?.send === 'function') {
    return res.send(problem);
  }
  return problem;
}

// Express-compatible error middleware requires the four-argument signature.
// eslint-disable-next-line max-params
export function errorMiddleware(err, req, res, _next) {
  const problem = toProblem(err, req);
  setResponseHeaders(res, problem);
  return sendProblemBody(res, problem);
}

export const errorHandler = errorMiddleware;
export const problemDetailsMiddleware = errorMiddleware;

export function notFoundHandler(req, res, _next) {
  const err = new Error('Not Found');
  err.status = 404;
  err.code = 'NOT_FOUND';
  if (typeof _next === 'function') {
    return _next(err);
  }
  return errorMiddleware(err, req, res, undefined);
}

export const notFound = notFoundHandler;
