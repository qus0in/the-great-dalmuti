const RANK_NAMES =
  ',대달무티,대주교,시종장,남작부인,수녀원장,기사,재봉사,석공,요리사,양치기,광부,농노,어릿광대'.split(
    ',',
  );

export function rankLabel(rank, fallback) {
  return RANK_NAMES[rank] || fallback || String(rank ?? '');
}

function makeSpan(doc, className, text) {
  const el = doc.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

function createCorner(doc, posClass, { rankText, nameText }) {
  const corner = doc.createElement('div');
  corner.className = `card__corner ${posClass}`;
  corner.setAttribute('aria-hidden', 'true');
  corner.appendChild(makeSpan(doc, 'card__rank', rankText));
  corner.appendChild(makeSpan(doc, 'card__name-subtle', nameText));
  return corner;
}

function appendCardBody(doc, article, labels) {
  const crest = doc.createElement('div');
  crest.className = 'card__crest';
  crest.setAttribute('aria-hidden', 'true');
  crest.appendChild(makeSpan(doc, 'card__crest-inner', labels.rankText));
  const title = makeSpan(doc, 'card__title', labels.nameText);
  title.setAttribute('aria-hidden', 'true');
  article.appendChild(createCorner(doc, 'card__corner--top-left', labels));
  article.appendChild(crest);
  article.appendChild(title);
  article.appendChild(createCorner(doc, 'card__corner--bottom-right', labels));
}

function resolveCardMeta(card, index, selected) {
  const rank = Number(card.rank);
  const isJester = Boolean(card.isJester) || rank === 13;
  const rankText = isJester ? '★' : String(rank);
  const nameText = card.name ?? rankLabel(rank);
  const rankClass = isJester ? 'card--jester' : `card--rank-${rank}`;
  const fan = index > 0 ? ` hand-fan__card--${index}` : '';
  const sel = selected ? ' is-selected' : '';
  const baseLabel = `${rankText} ${nameText}`;
  const ariaLabel = selected ? `${baseLabel} (선택됨)` : baseLabel;
  const className = `card ${rankClass}${fan}${sel}`;
  return { rankText, nameText, className, ariaLabel };
}

export function createCardElement(doc, card, opts = {}) {
  const { index = 0, selected = false } = opts;
  const meta = resolveCardMeta(card, index, selected);
  const article = doc.createElement('article');
  article.className = meta.className;
  article.dataset.play = 'card';
  article.dataset.cardId = card.id;
  article.setAttribute('tabindex', '0');
  article.setAttribute('aria-pressed', selected ? 'true' : 'false');
  article.setAttribute('aria-label', meta.ariaLabel);
  appendCardBody(doc, article, meta);
  return article;
}

export function renderHandCards(doc, { hand = [], selected = [] }) {
  const container = doc.querySelector('[data-play="hand"]');
  if (!container) return;
  container.textContent = '';
  hand.forEach((card, i) => {
    const opts = { index: i + 1, selected: selected.includes(card.id) };
    container.appendChild(createCardElement(doc, card, opts));
  });
}

function updateTrickTarget(doc, rank, count) {
  const el = doc.querySelector('[data-play="trick-target"]');
  const r = rank === 13 ? '★' : String(rank);
  const text = count ? `${count}장 조합 (${r} ${rankLabel(rank)})` : '새 트릭';
  if (el) el.textContent = text;
}

export function renderTrickCards(doc, lastPlay) {
  const count = Number(lastPlay?.count || 0);
  const rank = Number(lastPlay?.rank || 0);
  updateTrickTarget(doc, rank, count);
  const trickEl = doc.querySelector('[data-play="trick"]');
  const key = `${rank}:${count}`;
  if (!trickEl || trickEl._trickKey === key) return;
  trickEl._trickKey = key;
  trickEl.textContent = '';
  for (let i = 1; i <= count; i += 1) {
    const wrap = doc.createElement('div');
    wrap.className = `table-felt__card-wrap table-felt__card-wrap--${i}`;
    const card = { id: `trick-${i}`, rank, isJester: rank === 13 };
    wrap.appendChild(createCardElement(doc, card));
    trickEl.appendChild(wrap);
  }
}
