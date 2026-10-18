// 대기실 내 프로필 카드 — ADR-0016 결정 11·17·24·26, 계약 2·3·4(아바타는 avatar.js import만)
import { avatarPath, renderAvatar, avatarUrl } from './avatar.js';
import { setupProfileAppeal } from './profile-appeal.js';
// 결정 2·17·24 — 안내 문구(사용자 원문 그대로): 형식·용량·업로드실패·의심·위반
export const NOTICES = {
  format: '지원하지 않는 파일 형식이에요. PNG·JPEG·WebP로 골라 주세요.',
  size: '파일이 너무 커요. 1MB 이하로 골라 주세요.',
  uploadFail: '사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.',
  suspect: '정책 위반 의심으로 프로필 사진이 가려졌어요. 검토 후 풀어드릴게요!',
  violation: '정책 위반으로 프로필 사진이 삭제됐어요.',
};
export const ACCEPT = 'image/png,image/jpeg,image/webp';
export const MAX_BYTES = 1024 * 1024;
export const kindOf = (d) => (d === 'suspect' || d === 'violation' ? d : null);
export const checkFile = (f) =>
  ACCEPT.indexOf(f.type) === -1
    ? NOTICES.format
    : f.size > MAX_BYTES
      ? NOTICES.size
      : '';
const setNotice = (root, text) => {
  const n = root.querySelector('[data-profile="notice"]');
  if (n) {
    n.hidden = !text;
    n.textContent = text;
  }
};
// 결정 26 — 의심·위반만: 문구 표시와 함께 버튼·input을 모두 비활성한다.
export const applyHiddenState = (root, kind) => {
  const text = NOTICES[kind] ?? '';
  const lock = Boolean(text);
  ['change', 'input'].forEach((k) => {
    const el = root.querySelector(`[data-profile="${k}"]`);
    if (el) el.disabled = lock;
  });
  setNotice(root, text);
  return lock;
};
const drawAvatar = (c) => {
  const box = c.root.querySelector('[data-profile="avatar"]');
  box?.replaceChildren(
    renderAvatar(c.root.ownerDocument, {
      userId: c.userId,
      name: c.name,
      isBot: false,
      hidden: Boolean(c.hiddenKind),
      url: avatarUrl(c.sb, c.userId, c.version),
      size: 'lg',
    }),
  );
};
const uploadAvatar = (c, file) =>
  c.sb.storage.from('avatars').upload(avatarPath(c.userId), file, {
    upsert: true,
    contentType: file.type,
  });
export function createProfileCard(deps) {
  const card = { ...deps, version: 0, hiddenKind: null };
  const appeal = setupProfileAppeal(card);
  card.appeal = appeal;
  async function select(file) {
    if (card.hiddenKind) return;
    const err = checkFile(file);
    if (err) return setNotice(card.root, err);
    const res = await uploadAvatar(card, file).catch(() => ({ error: true }));
    if (res.error) return setNotice(card.root, NOTICES.uploadFail);
    card.version += 1;
    drawAvatar(card);
    setNotice(card.root, '');
  }
  async function loadHiddenState() {
    const res = await card.sb.rpc('my_hidden_profile_kind').catch(() => ({}));
    card.hiddenKind = kindOf(res?.data);
    applyHiddenState(card.root, card.hiddenKind);
    drawAvatar(card);
    await card.appeal?.sync();
  }
  return { select, loadHiddenState, card };
}
export async function initProfileCard() {
  if (typeof document === 'undefined') return;
  const root = document.querySelector('[data-profile="card"]');
  const auth = await import('./auth.js');
  const user = await auth.currentUser();
  if (!root || !user) return;
  const sb = await auth.getClient();
  const name = user.user_metadata?.full_name ?? user.email ?? '';
  const card = createProfileCard({ root, sb, userId: user.id, name });
  await card.loadHiddenState();
  const input = root.querySelector('[data-profile="input"]');
  root
    .querySelector('[data-profile="change"]')
    ?.addEventListener('click', () => input?.click());
  input?.addEventListener('change', () => {
    if (input.files?.[0]) card.select(input.files[0]).catch(() => {});
    input.value = '';
  });
}
if (typeof document !== 'undefined') initProfileCard().catch(() => {});
