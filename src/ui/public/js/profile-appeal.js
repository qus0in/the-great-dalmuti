// 프로필 카드 이의제기 — 계약 3·4, ADR-0016 결정 30·32
import { MODERATION_UI } from './features.js';
import { submitAppeal, myAppeal, APPEAL_MAX } from './moderation-api.js';

export const MAX_LENGTH = APPEAL_MAX ?? 500;
export const APPEAL_MESSAGES = {
  submitted: '이의제기를 보냈어요. 검토 후 알려 드릴게요.',
  duplicate: '이미 이의제기를 보냈어요.',
  upheld: '검토 결과 가림이 유지돼요.',
  failed: '이의제기를 보내지 못했어요. 잠시 후 다시 시도해 주세요.',
};

function setAppealStatus(root, text) {
  const el = root?.querySelector('[data-appeal="status"]');
  if (el) {
    el.textContent = text;
    el.hidden = !text;
  }
}
function setHidden(root, key, hidden) {
  const el = root?.querySelector(`[data-appeal="${key}"]`);
  if (el) el.hidden = hidden;
}
function showStatus(root, text) {
  setHidden(root, 'open', true);
  setHidden(root, 'form', true);
  setAppealStatus(root, text);
}
function updateCount(root) {
  const ta = root?.querySelector('[data-appeal="textarea"]');
  const count = root?.querySelector('[data-appeal="count"]');
  const btn = root?.querySelector('[data-appeal="submit"]');
  if (!ta || !count) return;
  const len = ta.value.length;
  count.textContent = `${MAX_LENGTH - len}자 남음`;
  if (btn) btn.disabled = len < 1 || len > MAX_LENGTH;
}
function showForm(root) {
  setHidden(root, 'open', true);
  setHidden(root, 'form', false);
  const ta = root?.querySelector('[data-appeal="textarea"]');
  if (ta) {
    ta.value = '';
    updateCount(root);
    ta.focus?.();
  }
  setAppealStatus(root, '');
}
function myAppealMessage(res = {}) {
  if (res.decision === 'upheld') return APPEAL_MESSAGES.upheld;
  return res.hasAppeal || res.submitted ? APPEAL_MESSAGES.duplicate : null;
}
async function syncAppeal(card, root) {
  const on = card.features?.moderationUi ?? MODERATION_UI;
  setHidden(root, 'root', !card.hiddenKind || !on);
  if (!card.hiddenKind || !on) return showStatus(root, '');
  const res = await myAppeal(card.sb, card.userId).catch(() => ({}));
  const msg = myAppealMessage(res);
  if (msg) return showStatus(root, msg);
  setHidden(root, 'open', false);
  setHidden(root, 'form', true);
  setAppealStatus(root, '');
}
function submitMessage(res = {}) {
  if (res.ok) return APPEAL_MESSAGES.submitted;
  return res.code === 'duplicate'
    ? APPEAL_MESSAGES.duplicate
    : APPEAL_MESSAGES.failed;
}
async function submitAppealAction(card, root, text) {
  const ta = root?.querySelector('[data-appeal="textarea"]');
  const body = typeof text === 'string' ? text : (ta?.value ?? '');
  const res = await submitAppeal(card.sb, card.userId, body).catch(() => ({}));
  showStatus(root, submitMessage(res));
  if (!res.ok && res.code !== 'duplicate') setHidden(root, 'form', false);
  return res;
}
function bindEvents(root, onSubmit) {
  const q = (sel) => root?.querySelector(`[data-appeal="${sel}"]`);
  const ta = q('textarea');
  q('open')?.addEventListener('click', () => showForm(root));
  ta?.addEventListener('input', () => updateCount(root));
  q('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = ta?.value?.trim() ?? '';
    if (v.length >= 1 && v.length <= MAX_LENGTH) onSubmit(v);
  });
}
export function setupProfileAppeal(card) {
  const { root } = card;
  const doSubmit = (text) => submitAppealAction(card, root, text);
  bindEvents(root, doSubmit);
  return {
    sync: () => syncAppeal(card, root),
    showForm: () => showForm(root),
    doSubmit,
    updateCount: () => updateCount(root),
    setStatus: (text) => setAppealStatus(root, text),
  };
}
