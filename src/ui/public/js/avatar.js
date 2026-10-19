export const SILHOUETTE_SRC = '/images/avatar-silhouette.svg';
export const BOT_SRC = '/images/avatar-bot.svg';

export const avatarPath = (userId) => `${userId}/avatar`;

function appendVersion(url, version) {
  if (version === undefined || version === null) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}

export function avatarUrl(sb, userId, version) {
  if (!sb || !userId) return '';
  const { storage } = sb;
  if (!storage) return '';
  const res = storage.from('avatars').getPublicUrl(avatarPath(userId));
  const url = (res && res.data && res.data.publicUrl) || '';
  return url ? appendVersion(url, version) : '';
}

export async function fetchHiddenIds(sb, userIds) {
  try {
    const list = (userIds ? [...userIds] : []).filter(Boolean);
    if (!sb || !sb.from || list.length === 0) return new Set();
    const { data, error } = await sb
      .from('hidden_profiles')
      .select('user_id')
      .in('user_id', list);
    if (error || !data) {
      // eslint-disable-next-line no-console -- 계약 2 실패 시 console.warn 요구
      console.warn('fetchHiddenIds query failed:', error);
      return new Set();
    }
    // eslint-disable-next-line compat/compat -- Set은 계약 2 반환 규격
    return new Set(data.map((row) => row.user_id));
  } catch (err) {
    // eslint-disable-next-line no-console -- 계약 2 실패 시 console.warn 요구
    console.warn('fetchHiddenIds exception:', err);
    // eslint-disable-next-line compat/compat -- Set은 계약 2 반환 규격
    return new Set();
  }
}

function resolveAvatarSrc({ isBot, hidden, url }) {
  if (isBot) return BOT_SRC;
  return hidden || !url ? SILHOUETTE_SRC : url;
}

export function renderAvatar(doc, props = {}) {
  const { name, size = 'sm' } = props;
  const span = doc.createElement('span');
  span.className = size ? `avatar avatar--${size}` : 'avatar';
  const img = doc.createElement('img');
  img.className = 'avatar__img';
  img.alt = name ? `${name} 프로필` : '프로필';
  const dim = size === 'lg' ? '64' : '36';
  img.setAttribute('width', dim);
  img.setAttribute('height', dim);
  const src = resolveAvatarSrc(props);
  img.src = src;
  const fallback = () => {
    img.src = SILHOUETTE_SRC;
  };
  if (src !== SILHOUETTE_SRC && src !== BOT_SRC && img.addEventListener) {
    img.addEventListener('error', fallback, { once: true });
  }
  span.appendChild(img);
  return span;
}

function seatUrl(item, ctx) {
  if (item.isBot || !item.userId || !ctx?.sb) return item.avatarUrl || null;
  return avatarUrl(ctx.sb, item.userId);
}

export function resolveSeatAvatar(item, ctx) {
  const isBot = Boolean(item.isBot);
  const userId = item.userId || null;
  const hidden = Boolean(userId && ctx?.hiddenIds?.has(userId));
  const name = item.userName || '';
  const url = seatUrl(item, ctx);
  return {
    userId,
    name,
    isBot,
    hidden,
    url,
    size: 'sm',
    key: `${resolveAvatarSrc({ isBot, hidden, url })}|${name}|sm`,
  };
}

export function mountAvatar(box, node) {
  if (!box || !node) return;
  if (box.replaceChildren) box.replaceChildren(node);
  else {
    while (box.firstChild) box.removeChild(box.firstChild);
    box.appendChild(node);
  }
}
