import { rankLabel } from './play-dom-cards.js';
import { seatTitle } from './play-dom-seats.js';

// 종료 안내 문구: 끝난 판은 내 칭호, 진행 중은 마지막 트릭 내용
export function bannerText(pub, mySeat) {
  if (pub?.phase === 'finished') {
    const mine = (pub.seatSummary || []).find((s) => s.seat === mySeat);
    return seatTitle(mine?.finishPosition) || '라운드 종료';
  }
  const last = pub?.lastPlay;
  if (last) return `좌석 ${last.seat}: ${rankLabel(last.rank)} ${last.count}장`;
  return '새 트릭 시작';
}
