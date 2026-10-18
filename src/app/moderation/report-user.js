const REASONS = new Set(['photo', 'chat', 'other']);
const reply = (status, error) => ({
  status,
  body: error ? { error } : { ok: true },
});

function invalidInput({ accessToken, reporterId, targetId, reason } = {}) {
  return !accessToken || !reporterId || !targetId || !REASONS.has(reason);
}

async function saveReport(repository, input) {
  const { error } = await repository.insertReport(input);
  if (!error) return { duplicate: false };
  if (error.code === '23505') return { duplicate: true };
  const forbidden = error.code === '42501';
  return {
    response: reply(
      forbidden ? 403 : 500,
      forbidden ? 'FORBIDDEN' : 'REPORT_FAILED',
    ),
  };
}

async function holdSuspectAvatar(repository, targetId) {
  const hidden = await repository.hiddenProfileKind(targetId);
  if (hidden.error) return reply(500, 'REPORT_FAILED');
  if (hidden.data?.kind !== 'suspect') return null;
  const held = await repository.holdAvatar(targetId);
  return held.error ? reply(500, 'AVATAR_HOLD_FAILED') : null;
}

async function submitReport(repository, input) {
  if (invalidInput(input)) return reply(400, 'INVALID_REPORT');
  try {
    const saved = await saveReport(repository, input);
    if (saved.response) return saved.response;
    const holdError = await holdSuspectAvatar(repository, input.targetId);
    if (holdError) return holdError;
    return saved.duplicate ? reply(409, 'DUPLICATE') : reply(201);
  } catch {
    return reply(500, 'REPORT_FAILED');
  }
}

export function createReportUser(repository) {
  return (input) => submitReport(repository, input);
}
