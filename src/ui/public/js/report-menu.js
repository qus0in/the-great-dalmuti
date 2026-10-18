// 신고 메뉴 대화상자 — 사유 선택 → 확인 → 결과 안내. 계약 1·2.
import { reportUser } from './moderation-api.js';
export const REPORT_LABELS = {
  photo: '부적절한 사진',
  chat: '욕설·도배 채팅',
  other: '기타',
};
export const REPORT_DONE = '신고했어요.';
export const REPORT_DUP = '이미 신고했어요.';
export const REPORT_FAIL = '신고를 보내지 못했어요.';
const REASONS = ['photo', 'chat', 'other'];
export function isReportable(view) {
  if (!view || !view.me || !view.targetId) return false;
  return view.me !== view.targetId && view.isBot !== true;
}
// eslint-disable-next-line max-params -- 태그·클래스·문구를 한 번에 두는 생성 관례
function node(doc, tag, cls, text) {
  const el = doc.createElement(tag);
  el.className = cls;
  el.textContent = text || '';
  return el;
}
function buildMenu(doc) {
  const root = node(doc, 'section', 'report-menu');
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', '신고하기');
  const form = node(doc, 'form', 'report-menu__form');
  const inputs = REASONS.map((reason) => {
    const label = node(doc, 'label', 'report-menu__reason');
    const input = doc.createElement('input');
    input.setAttribute('type', 'radio');
    input.setAttribute('name', 'report-reason');
    input.value = reason;
    label.append(input, node(doc, 'span', '', REPORT_LABELS[reason]));
    return label;
  });
  form.append(...inputs);
  const cancel = node(doc, 'button', 'report-menu__cancel', '닫기');
  cancel.setAttribute('type', 'button');
  const result = node(doc, 'p', 'report-menu__result');
  result.hidden = true;
  result.setAttribute('role', 'status');
  form.append(node(doc, 'button', 'report-menu__confirm', '신고'), cancel);
  root.append(form, result);
  return { root, form, inputs, cancel, result };
}
function openMenu(ui, targetId, reason) {
  const { inputs, result, root } = ui;
  if (!targetId) return null;
  const initial = REASONS.indexOf(reason) === -1 ? 'other' : reason;
  inputs.forEach((label) => {
    const input = label.children[0];
    input.checked = input.value === initial;
  });
  result.hidden = true;
  root.hidden = false;
  return { targetId };
}
async function submitMenu(ui, job) {
  const { inputs, result } = ui;
  const picked = inputs.find((label) => label.children[0].checked);
  const reason = picked ? picked.children[0].value : 'other';
  const submit = job.reportUserImpl || reportUser;
  const res = await submit(job.client, job.me, job.target.targetId, reason);
  result.textContent = res.ok
    ? REPORT_DONE
    : res.code === '23505'
      ? REPORT_DUP
      : REPORT_FAIL;
  result.hidden = false;
  if (job.onDone) job.onDone(res, job.target);
}
export function mountReportMenu(doc, options = {}) {
  const { client, me, onDone, reportUserImpl } = options;
  const ui = buildMenu(doc);
  if (doc.body && doc.body.appendChild) doc.body.appendChild(ui.root);
  let target = null;
  const close = () => {
    ui.root.hidden = true;
    target = null;
  };
  ui.cancel.addEventListener('click', close);
  ui.root.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') close();
  });
  ui.form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (target) submitMenu(ui, { client, me, target, onDone, reportUserImpl });
  });
  return {
    root: ui.root,
    open: (id, reason) => Boolean((target = openMenu(ui, id, reason))),
    close,
  };
}
