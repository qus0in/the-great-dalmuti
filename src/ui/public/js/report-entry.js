// 신고 진입점 연결 — 좌석·채팅에 '신고' 버튼을 꽂는 콜백 주입부.
import { MODERATION_UI } from './features.js';
import { isReportable } from './report-menu.js';
const enabled = (holder) => holder?.features?.moderationUi ?? MODERATION_UI;
function buttonOf(doc, spec) {
  const btn = doc.createElement('button');
  btn.className = spec.cls;
  btn.textContent = '신고';
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', `${spec.name || '상대'} 신고하기`);
  btn.addEventListener('click', () => spec.onReport(spec.target));
  return btn;
}
export function syncSeatButton(seat, item, report) {
  const old = seat.querySelector('[data-report="seat"]');
  if (old && old.remove) old.remove();
  if (!enabled(report)) return;
  const row = seat.querySelector('.seat__name-row');
  if (!report || !report.onReport || !row) return;
  const view = { me: report.me, targetId: item.userId, isBot: item.isBot };
  if (!isReportable(view)) return;
  const btn = buttonOf(seat.ownerDocument, {
    cls: 'seat__report',
    name: item.userName,
    target: { targetId: item.userId, reason: 'photo' },
    onReport: report.onReport,
  });
  btn.setAttribute('data-report', 'seat');
  row.appendChild(btn);
}
export function chatReport(ctx, item, msg) {
  if (!enabled(ctx)) return;
  if (!ctx.onReport || msg.mine) return;
  const view = { me: ctx.me, targetId: msg.userId, isBot: msg.isBot };
  if (!isReportable(view)) return;
  const btn = buttonOf(ctx.doc, {
    cls: 'chat-panel__report',
    name: msg.name,
    target: { targetId: msg.userId, reason: 'chat' },
    onReport: ctx.onReport,
  });
  item.appendChild(btn);
}
