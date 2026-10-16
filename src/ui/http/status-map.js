import { PROBLEM_STATUSES } from './status-constants.js';
import { PROBLEM_STATUS_RULES } from './status-rules.js';

export * from './status-constants.js';
export * from './status-checks.js';
export * from './status-rules.js';

export const statusCodeMap = PROBLEM_STATUS_RULES;
export const statusMap = PROBLEM_STATUSES;
export const errorStatusMap = PROBLEM_STATUSES;
export const ERROR_STATUS_MAP = PROBLEM_STATUSES;
export const problemStatusMap = PROBLEM_STATUSES;
export const ERROR_CODE_TO_STATUS = Object.freeze({
  NOT_YOUR_TURN: PROBLEM_STATUSES.conflict,
  STALE_VERSION: PROBLEM_STATUSES.conflict,
  ROOM_FULL: PROBLEM_STATUSES.conflict,
  ROUND_ENDED: PROBLEM_STATUSES.gone,
  RATE_LIMITED: PROBLEM_STATUSES.rateLimited,
  NOT_FOUND: PROBLEM_STATUSES.notFound,
});
