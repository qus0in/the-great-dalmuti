import { renderAvatar } from './avatar.js';
import { copyInviteLink } from './play-lobby-copy.js';
function el(doc, tag, cls) {
  const node = doc.createElement(tag);
  node.className = cls;
  return node;
}
function clear(node) {
  if (typeof node.replaceChildren === 'function') node.replaceChildren();
  else while (node.firstChild) node.removeChild(node.firstChild);
}
function seatItem(doc, seat) {
  const item = el(doc, 'li', 'lobby__seat');
  const avatar = renderAvatar(doc, {
    name: seat.userName ?? '',
    isBot: Boolean(seat.isBot),
    size: 'sm',
  });
  item.appendChild(avatar);
  const name = el(doc, 'span', 'lobby__name');
  name.textContent = seat.userName ?? '';
  item.appendChild(name);
  return item;
}
function inviteRow(doc, state, handlers) {
  const row = el(doc, 'div', 'lobby__link-row');
  const link = el(doc, 'span', 'lobby__link');
  link.setAttribute('data-play', 'lobby-link');
  link.textContent = state.link ?? '';
  const copy = el(doc, 'button', 'btn btn--secondary lobby__copy');
  copy.setAttribute('type', 'button');
  copy.setAttribute('data-play', 'lobby-copy');
  copy.textContent = '링크 복사';
  const status = el(doc, 'p', 'lobby__copy-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('data-play', 'lobby-copy-status');
  status.textContent = '';
  copy.addEventListener('click', () => {
    copyInviteLink(doc, link, state.link ?? '').then((text) => {
      status.textContent = text;
    });
    if (typeof handlers.onCopy === 'function')
      handlers.onCopy(state.link ?? '');
  });
  row.append(link, copy);
  return { row, copy, status };
}
function actionArea(doc, state, handlers) {
  const area = el(doc, 'div', 'lobby__actions');
  if (!state.isHost) {
    const wait = el(doc, 'p', 'lobby__wait');
    wait.setAttribute('role', 'status');
    wait.setAttribute('data-play', 'lobby-wait');
    wait.textContent = '방장이 시작하기를 기다리는 중';
    area.appendChild(wait);
    return { area, start: null };
  }
  const start = el(doc, 'button', 'btn btn--gold lobby__start');
  start.setAttribute('type', 'button');
  start.setAttribute('data-play', 'lobby-start');
  start.textContent = '시작';
  start.disabled = !state.canStart;
  start.addEventListener('click', () => handlers.onStart?.());
  area.appendChild(start);
  return { area, start };
}
export function renderLobby(doc, state = {}, handlers = {}) {
  const root = doc.querySelector('[data-play="lobby"]');
  if (!root) return null;
  clear(root);
  root.hidden = false;
  const title = el(doc, 'h2', 'lobby__title');
  title.textContent = '친구를 초대하세요';
  const codeRow = el(doc, 'p', 'lobby__code-row');
  codeRow.textContent = '참가 코드 ';
  const code = el(doc, 'strong', 'lobby__code');
  code.setAttribute('data-play', 'lobby-code');
  code.textContent = state.code ?? '';
  codeRow.appendChild(code);
  const invite = inviteRow(doc, state, handlers);
  const seats = el(doc, 'ul', 'lobby__seats');
  seats.setAttribute('data-play', 'lobby-seats');
  for (const seat of state.seats ?? []) seats.appendChild(seatItem(doc, seat));
  const action = actionArea(doc, state, handlers);
  root.append(title, codeRow, invite.row, invite.status, seats, action.area);
  return {
    root,
    copyBtn: invite.copy,
    copyStatus: invite.status,
    startBtn: action.start,
  };
}
export function hideLobby(doc) {
  const root = doc.querySelector('[data-play="lobby"]');
  if (root) root.hidden = true;
}
