import { renderAvatar } from './avatar.js';
import { chatReport } from './report-entry.js';
// prettier-ignore
export const REASONS = { 'too-long': '200자까지 보낼 수 있어요.', 'too-fast': '조금 천천히 보내 주세요.', blocked: '지금은 채팅을 보낼 수 없어요.' }; // 제안 문구
function node(doc, tag, cls) {
  const el = doc.createElement(tag);
  el.className = cls;
  return el;
}
function build(doc) {
  const root = node(doc, 'section', 'chat-panel');
  const openBtn = node(doc, 'button', 'chat-panel__open');
  openBtn.textContent = '채팅';
  const badge = node(doc, 'span', 'chat-panel__badge');
  openBtn.appendChild(badge);
  const body = node(doc, 'div', 'chat-panel__body');
  const list = node(doc, 'ul', 'chat-panel__list');
  const notice = node(doc, 'p', 'chat-panel__notice');
  notice.hidden = true;
  const form = node(doc, 'form', 'chat-panel__form');
  const input = node(doc, 'input', 'chat-panel__input');
  input.setAttribute('maxlength', '200');
  input.setAttribute('aria-label', '채팅 입력');
  const sendBtn = node(doc, 'button', 'chat-panel__send');
  sendBtn.textContent = '보내기';
  form.append(input, sendBtn);
  body.append(list, notice, form);
  root.append(openBtn, body);
  return { root, openBtn, badge, body, list, notice, form, input };
}
function addOne(ctx, msg) {
  const item = node(ctx.doc, 'li', 'chat-panel__msg');
  const view = ctx.avatarFor ? ctx.avatarFor(msg) : { name: msg.name };
  item.appendChild(renderAvatar(ctx.doc, { ...view, size: 'sm' }));
  const name = node(ctx.doc, 'span', 'chat-panel__name');
  name.textContent = msg.name ?? '';
  const text = node(ctx.doc, 'span', 'chat-panel__text');
  text.textContent = msg.text ?? '';
  item.append(name, text);
  chatReport(ctx, item, msg);
  ctx.list.appendChild(item);
}
function track(doc, ui) {
  const { body, badge } = ui;
  let unread = 0;
  let open = false;
  const paint = () => {
    body.hidden = !open;
    badge.hidden = open || unread === 0;
    badge.textContent = String(unread);
    doc.documentElement?.classList?.toggle('has-chat-open', open);
  };
  paint();
  return {
    setOpen: (next) => {
      open = next;
      if (open) unread = 0;
      paint();
    },
    arrived: () => {
      if (open) return;
      unread += 1;
      paint();
    },
  };
}
function wireForm(ui, chat) {
  const { form, input, notice } = ui;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const res = await chat.send(text);
    if (res && res.ok) input.value = '';
    else {
      notice.textContent = REASONS[res.reason] ?? '';
      notice.hidden = !notice.textContent;
    }
  });
}
export function mountChatPanel(doc, options = {}) {
  const { chat, isTutorial, avatarFor, me, onReport, features } = options;
  const ui = build(doc);
  if (doc.body && doc.body.appendChild) doc.body.appendChild(ui.root);
  const state = track(doc, ui);
  ui.openBtn.addEventListener('click', () => state.setOpen(ui.body.hidden));
  if (isTutorial) ui.root.hidden = true;
  else wireForm(ui, chat);
  const ctx = { doc, list: ui.list, avatarFor, me, onReport, features };
  return {
    root: ui.root,
    setOpen: state.setOpen,
    addMessage: (msg) => {
      if (ui.root.hidden) return;
      addOne(ctx, msg);
      state.arrived();
    },
    close: () => chat.close && chat.close(),
  };
}
