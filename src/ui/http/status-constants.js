export const PROBLEM_STATUSES = Object.freeze({
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  gone: 410,
  domain: 422,
  rateLimited: 429,
  upstream: 503,
  unknown: 500,
});

const STATUS_TITLES = Object.freeze({
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  410: 'Gone',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  503: 'Service Unavailable',
  500: 'Internal Server Error',
});

export function titleForStatus(status) {
  return STATUS_TITLES[status] ?? 'Error';
}
