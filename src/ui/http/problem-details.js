import {
  statusForError,
  titleForStatus,
  PROBLEM_STATUSES,
} from './status-map.js';

export { statusForError, titleForStatus, PROBLEM_STATUSES };

function safeDetail(err, status) {
  if (status >= 500) return 'An unexpected error occurred.';
  const candidate = err?.detail ?? err?.message;
  if (typeof candidate === 'string') return candidate;
  return titleForStatus(status);
}

export function toProblem(err, req) {
  const status = statusForError(err);
  return {
    type: 'about:blank',
    title: titleForStatus(status),
    status,
    detail: safeDetail(err, status),
    instance: req?.originalUrl ?? req?.url ?? req?.path,
    code: err?.code ?? null,
  };
}
