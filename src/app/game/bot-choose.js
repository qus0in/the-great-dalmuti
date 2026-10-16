import { canBeat, evaluatePlay } from '../../domain/game/play.js';

// 같은 숫자 묶음으로 손패를 나눈다 (낮은 숫자부터)
function groupByRank(hand) {
  const groups = new Map();
  for (const card of hand) {
    if (!groups.has(card.rank)) groups.set(card.rank, []);
    groups.get(card.rank).push(card);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}

// 봇 선택: 낼 수 있는 가장 낮은 조합, 없으면 패스 (순수 함수)
// - 선(리드가 없음): 가장 낮은 숫자 묶음 전체 (ADR-0001에 선 규칙 없음)
// - 합법 판정은 도메인에만 맡긴다. 반환 카드는 id 목록(playCards 입력 형태)
export function chooseBotAction(hand, trickState) {
  const groups = groupByRank(hand ?? []);
  const lastPlay = trickState?.lastPlay ?? null;
  if (lastPlay === null) {
    const lowest = groups[0];
    if (!lowest) return { action: 'pass' };
    return { action: 'play', cards: lowest[1].map((c) => c.id) };
  }
  for (const [, cards] of groups) {
    if (cards.length < lastPlay.count) continue;
    const combo = cards.slice(0, lastPlay.count);
    if (canBeat(lastPlay, evaluatePlay(combo))) {
      return { action: 'play', cards: combo.map((c) => c.id) };
    }
  }
  return { action: 'pass' };
}
