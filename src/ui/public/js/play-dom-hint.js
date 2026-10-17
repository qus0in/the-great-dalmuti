function hintDisplay(reason) {
  const text = typeof reason === 'string' ? reason : '';
  return { text, hidden: !text.trim() };
}

function updateDescription(card, hintId, recommended) {
  const ids = (card.getAttribute?.('aria-describedby') ?? '')
    .split(/\s+/)
    .filter((id) => id && id !== hintId);
  if (recommended && hintId) ids.push(hintId);
  if (ids.length) card.setAttribute('aria-describedby', ids.join(' '));
  else card.removeAttribute?.('aria-describedby');
}

function updateCardHints(doc, cards, hintId) {
  const nodes = doc.querySelectorAll?.('[data-play="card"]');
  if (!nodes) return;
  for (let i = 0; i < nodes.length; i += 1) {
    const card = nodes[i];
    const recommended = cards.indexOf(card.dataset.cardId) !== -1;
    const classes = card.className.split(/\s+/).filter(Boolean);
    card.className = classes
      .filter((name) => name !== 'is-hinted')
      .concat(recommended ? ['is-hinted'] : [])
      .join(' ');
    updateDescription(card, hintId, recommended);
  }
}

export function renderHint(doc, view = {}) {
  const region = doc.querySelector('[data-play="hint"]');
  const { hint } = view;
  const { action, cards = [], reason } = hint ?? {};
  const recommendations =
    action === 'play' && cards && cards.indexOf ? cards : [];
  const display = hintDisplay(reason);
  if (region) {
    region.hidden = display.hidden;
    region.textContent = display.text;
  }
  updateCardHints(doc, recommendations, region?.id ?? 'play-hint');
}
