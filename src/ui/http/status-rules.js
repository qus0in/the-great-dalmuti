import { PROBLEM_STATUSES } from './status-constants.js';
import { containsCode, hasName, hasKind } from './status-checks.js';

export const PROBLEM_STATUS_RULES = [
  {
    status: PROBLEM_STATUSES.validation,
    when: (err) =>
      Array.isArray(err?.issues) ||
      containsCode(err?.code, [
        'VALIDATION_ERROR',
        'INVALID_INPUT',
        'INVALID_BODY',
        'SCHEMA_ERROR',
      ]),
  },
  {
    status: PROBLEM_STATUSES.unauthenticated,
    when: (err) =>
      hasName(err, ['AuthenticationError', 'UnauthorizedError']) ||
      containsCode(err?.code, [
        'UNAUTHENTICATED',
        'UNAUTHORIZED',
        'AUTH_REQUIRED',
        'INVALID_TOKEN',
        'EXPIRED_TOKEN',
        'JWT_INVALID',
      ]),
  },
  {
    status: PROBLEM_STATUSES.forbidden,
    when: (err) =>
      hasName(err, ['ForbiddenError', 'PermissionError']) ||
      containsCode(err?.code, [
        'FORBIDDEN',
        'PERMISSION_DENIED',
        'ACCESS_DENIED',
        'NOT_ROOM_ADMIN',
      ]),
  },
  {
    status: PROBLEM_STATUSES.notFound,
    when: (err) =>
      hasName(err, ['NotFoundError', 'NotFound']) ||
      containsCode(err?.code, [
        'NOT_FOUND',
        'ROOM_NOT_FOUND',
        'RESOURCE_NOT_FOUND',
      ]),
  },
  {
    status: PROBLEM_STATUSES.conflict,
    when: (err) =>
      containsCode(err?.code, [
        'NOT_YOUR_TURN',
        'STALE_VERSION',
        'ROOM_FULL',
        'CONFLICT',
      ]) || hasName(err, ['ConflictError']),
  },
  {
    status: PROBLEM_STATUSES.gone,
    when: (err) =>
      containsCode(err?.code, ['ROUND_ENDED', 'GONE']) ||
      hasName(err, ['GoneError']),
  },
  {
    status: PROBLEM_STATUSES.domain,
    when: (err) =>
      err?.isDomainError === true ||
      err?.name === 'DomainError' ||
      hasKind(err, 'domain'),
  },
  {
    status: PROBLEM_STATUSES.rateLimited,
    when: (err) =>
      containsCode(err?.code, [
        'RATE_LIMITED',
        'RATE_LIMIT_EXCEEDED',
        'TOO_MANY_REQUESTS',
      ]) || hasName(err, ['RateLimitError']),
  },
  {
    status: PROBLEM_STATUSES.upstream,
    when: (err) =>
      containsCode(err?.code, [
        'UPSTREAM_UNAVAILABLE',
        'SUPABASE_ERROR',
        'SERVICE_UNAVAILABLE',
        'UPSTREAM_ERROR',
      ]) || hasName(err, ['SupabaseError', 'UpstreamError', 'ServiceError']),
  },
  { status: PROBLEM_STATUSES.unknown, when: () => true },
];

export function statusForError(err) {
  for (const rule of PROBLEM_STATUS_RULES) {
    if (rule.when(err)) return rule.status;
  }
  return PROBLEM_STATUSES.unknown;
}
