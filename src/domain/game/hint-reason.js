import { isJesterCard } from './play.js';
import { RANK_NAMES } from './cards.js';

function describeCards(cards) {
  const jesters = cards.filter(isJesterCard).length;
  const regular = cards.length - jesters;
  const rank = cards.find((card) => !isJesterCard(card))?.rank ?? 13;
  const rankLabel = `${rank} ${RANK_NAMES[rank]}`;
  if (jesters === 0) return `${rankLabel} ${cards.length}장`;
  if (regular === 0) return `13 어릿광대 ${jesters}장`;
  return `${rankLabel} ${regular}장과 어릿광대 ${jesters}장`;
}

function hasStrongerCards(hand, cards) {
  const played = new Set(cards.map((card) => card.id));
  const playedRank = cards.find((card) => !isJesterCard(card))?.rank;
  return (hand ?? []).some(
    (card) =>
      !played.has(card.id) &&
      (isJesterCard(card) ||
        (playedRank !== undefined && card.rank < playedRank)),
  );
}

function revolutionActive(revolution) {
  return revolution === true || revolution?.isRevolution === true;
}

function buildLeadReason({ cards, description, hand, inRevolution }) {
  const lead = cards.every(isJesterCard)
    ? `선이에요. 다른 조합이 없어 ${description}을 내세요.`
    : hasStrongerCards(hand, cards)
      ? `선이에요. 가장 약한 ${description}부터 털어 더 강한 카드는 선을 되찾을 때 쓰세요.`
      : `선이에요. 손패를 줄이도록 ${description}부터 내세요.`;
  return inRevolution ? `혁명 중에도 카드 강약은 같아요. ${lead}` : lead;
}

function buildFollowReason({
  cards,
  description,
  hand,
  lastPlay,
  inRevolution,
}) {
  const rankName = RANK_NAMES[lastPlay.rank] ?? '카드';
  const response = `직전은 ${lastPlay.rank} ${rankName} ${lastPlay.count}장이라 ${lastPlay.rank - 1} 이하 ${lastPlay.count}장만 낼 수 있어요.`;
  const play = cards.some(isJesterCard)
    ? `일반 조합으로 이길 수 없어 ${description}을 섞어 내세요.`
    : `이길 수 있는 가장 약한 ${description}을 내세요.`;
  const reserve = hasStrongerCards(hand, cards)
    ? ' 더 강한 카드는 아껴 두세요.'
    : '';
  const prefix = inRevolution ? '혁명 중에도 카드 강약은 같아요. ' : '';
  return `${prefix}${response} ${play}${reserve}`;
}

export function buildHintReason({
  action,
  cards,
  lastPlay,
  isLeader,
  revolution,
  hand,
}) {
  const inRevolution = revolutionActive(revolution);
  if (action === 'pass') {
    return inRevolution
      ? '혁명 중에도 카드 강약은 같아요. 낼 수 있는 조합이 없어 패스해야 해요.'
      : '낼 수 있는 조합이 없어 패스해야 해요.';
  }
  const reason = {
    cards,
    description: describeCards(cards),
    hand,
    lastPlay,
    inRevolution,
  };
  return isLeader ? buildLeadReason(reason) : buildFollowReason(reason);
}
