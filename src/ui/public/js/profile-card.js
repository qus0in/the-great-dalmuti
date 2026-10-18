// 대기실 내 프로필 카드 — ADR-0016 결정 11·17·24·26, 계약 2·3·4(아바타는 avatar.js import만)
import { avatarPath, renderAvatar, avatarUrl } from './avatar.js';
// 결정 2·17·24 — 안내 문구(사용자 원문 그대로): 형식·용량·업로드실패·의심·위반
export const NOTICES = {
  format: '지원하지 않는 파일 형식이에요. PNG·JPEG·WebP로 골라 주세요.',
  size: '파일이 너무 커요. 1MB 이하로 골라 주세요.',
  uploadFail: '사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.',
  suspect: '정책 위반 의심으로 프로필 사진이 가려졌어요. 검토 후 풀어드릴게요!', // 결정 17
  violation: '정책 위반으로 프로필 사진이 삭제됐어요.', // 결정 24
};
// 결정 2 — PNG·JPEG·WebP 1MB. 버킷이 같은 검사로 강제하며 브라우저는 안내만 한다.
export const ACCEPT = 'image/png,image/jpeg,image/webp';
export const MAX_BYTES = 1024 * 1024;
export const kindOf = (data) =>
  data === 'suspect' || data === 'violation' ? data : null;
export const checkFile = (file) => {
  if (ACCEPT.split(',').indexOf(file.type) === -1) return NOTICES.format;
  return file.size > MAX_BYTES ? NOTICES.size : '';
};
const setNotice = (root, text) => {
  const notice = root.querySelector('[data-profile="notice"]');
  if (!notice) return;
  notice.hidden = !text;
  notice.textContent = text;
};
// 결정 26 — 의심·위반만: 문구 표시와 함께 버튼·input을 모두 비활성한다.
export const applyHiddenState = (root, kind) => {
  const text = NOTICES[kind] ?? '';
  const change = root.querySelector('[data-profile="change"]');
  const input = root.querySelector('[data-profile="input"]');
  if (change) change.disabled = Boolean(text);
  if (input) input.disabled = Boolean(text);
  setNotice(root, text);
  return Boolean(text);
};
// 계약 2·3 — renderAvatar props 그대로(`.avatar--lg`는 size로 전달).
const drawAvatar = (card) => {
  const box = card.root.querySelector('[data-profile="avatar"]');
  const avatar = renderAvatar(card.root.ownerDocument, {
    userId: card.userId,
    name: card.name,
    isBot: false,
    hidden: Boolean(card.hiddenKind),
    url: avatarUrl(card.sb, card.userId, card.version),
    size: 'lg',
  });
  if (box) box.replaceChildren(avatar);
};
// 계약 2 — upload(avatarPath(uid), file, { upsert: true, contentType })
const uploadAvatar = (card, file) =>
  card.sb.storage.from('avatars').upload(avatarPath(card.userId), file, {
    upsert: true,
    contentType: file.type,
  });
export function createProfileCard(deps) {
  const card = { ...deps, version: 0, hiddenKind: null };
  async function select(file) {
    if (card.hiddenKind) return; // 결정 26 — 가려진 동안 업로드 막음
    const violation = checkFile(file);
    if (violation) return setNotice(card.root, violation); // 같은 검사로 안내만
    const res = await uploadAvatar(card, file).catch(() => ({ error: true })); // reject는 이유 값과 무관하게 항상 실패
    if (res.error) return setNotice(card.root, NOTICES.uploadFail); // reject·결과 error 모두 실패 안내
    card.version = card.version + 1; // 성공마다 캐시 무효화 version
    drawAvatar(card);
    setNotice(card.root, '');
  }
  async function loadHiddenState() {
    try {
      const { data } = await card.sb.rpc('my_hidden_profile_kind');
      card.hiddenKind = kindOf(data); // 의심·위반만, 그 외 null
    } catch {
      card.hiddenKind = null; // 조회 실패 — 실제 차단은 서버 정책(Storage RLS)이 맡는다
    }
    applyHiddenState(card.root, card.hiddenKind);
    drawAvatar(card);
  }
  return { select, loadHiddenState, card };
}
// 세션·브라우저 처리는 auth.js 흐름을 따른다(로그인 전 카드는 data-auth 숨김).
export async function initProfileCard() {
  if (typeof document === 'undefined') return;
  const root = document.querySelector('[data-profile="card"]');
  const auth = await import('./auth.js');
  const user = await auth.currentUser();
  if (!root || !user) return;
  const { id, user_metadata, email } = user;
  const sb = await auth.getClient();
  const name = user_metadata?.full_name ?? email ?? '';
  const card = createProfileCard({ root, sb, userId: id, name });
  await card.loadHiddenState();
  const input = root.querySelector('[data-profile="input"]');
  const change = root.querySelector('[data-profile="change"]');
  change?.addEventListener('click', () => input?.click());
  input?.addEventListener('change', () => {
    const file = input.files?.item(0);
    if (file) card.select(file).catch(() => {}); // 미처리 rejection 없음
    input.value = '';
  });
}
if (typeof document !== 'undefined') initProfileCard().catch(() => {});
