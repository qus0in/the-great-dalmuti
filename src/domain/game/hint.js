import { canBeat, evaluatePlay } from './play.js';
import { buildHintReason } from './hint-reason.js';

function groupByRank(hand) {
  const groups = new Map();
  for (const card of hand ?? []) {
    if (!groups.has(card.rank)) groups.set(card.rank, []);
    groups.get(card.rank).push(card);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}

function asChoice(cards) {
  return cards ? { action: 'play', cards } : { action: 'pass' };
}

function selectLead(groups) {
  const regular = groups.filter(([rank]) => rank !== 13);
  const weak = regular.filter(([rank]) => rank > 3);
  return (weak.at(-1) ?? regular.at(-1) ?? groups.at(-1))?.[1] ?? null;
}

function mixedCandidate({ rank, cards, lastPlay, jesters }) {
  if (rank === 13 || cards.length === 0 || cards.length >= lastPlay.count) {
    return null;
  }
  const combo = [...cards, ...jesters.slice(0, lastPlay.count - cards.length)];
  return combo.length === lastPlay.count ? combo : null;
}

function isWinning(cards, lastPlay) {
  return cards && canBeat(lastPlay, evaluatePlay(cards));
}

function selectFollow(groups, lastPlay) {
  const regular = groups.filter(([rank]) => rank !== 13);
  const responses = regular
    .filter(([, cards]) => cards.length >= lastPlay.count)
    .map(([, cards]) => cards.slice(0, lastPlay.count))
    .filter((cards) => isWinning(cards, lastPlay))
    .sort((a, b) => evaluatePlay(b).rank - evaluatePlay(a).rank);
  if (responses.length > 0) return responses[0];

  const jesters = groups.find(([rank]) => rank === 13)?.[1] ?? [];
  return (
    regular
      .map(([rank, cards]) =>
        mixedCandidate({
          rank,
          cards,
          lastPlay,
          jesters,
        }),
      )
      .filter((cards) => isWinning(cards, lastPlay))
      .sort((a, b) => evaluatePlay(b).rank - evaluatePlay(a).rank)[0] ?? null
  );
}

// Lead with weak ranks (4–12), saving ranks 1–3 and jesters when possible.
// Follow with the weakest winning normal group; mix jesters only if none can win.
function selectPlay(hand, lastPlay) {
  const groups = groupByRank(hand);
  if (lastPlay === null) return asChoice(selectLead(groups));
  return asChoice(selectFollow(groups, lastPlay));
}

// Tutorial hints and bots share the selector, including legal jester mixes.
export function suggestPlay({ hand, lastPlay = null, isLeader, revolution }) {
  const leading = isLeader ?? lastPlay === null;
  const previous = leading ? null : lastPlay;
  const choice = selectPlay(hand, previous);
  const cards = choice.cards ?? [];
  return {
    action: choice.action,
    cards: cards.map((card) => card.id),
    reason: buildHintReason({
      action: choice.action,
      cards,
      lastPlay: previous,
      isLeader: leading,
      revolution,
      hand,
    }),
  };
}

export function chooseBotPlay(hand, lastPlay = null) {
  const choice = selectPlay(hand, lastPlay);
  return choice.action === 'play'
    ? { ...choice, cards: choice.cards.map((card) => card.id) }
    : choice;
}
