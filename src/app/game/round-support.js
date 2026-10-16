import { createTrickState, pass, play } from '../../domain/game/trick.js';
import { NotFoundError } from './room-errors.js';

const PLAYER_ORDER = ['0', '1', '2', '3'];

// 트릭 시작 시점 장수 = 현재 장수 + 그 트릭에서 낸 카드 수
function countsAtStart(hands, rows) {
  const counts = Object.fromEntries(
    PLAYER_ORDER.map((s) => [s, hands[Number(s)]?.length ?? 0]),
  );
  for (const row of rows) {
    if (row.action === 'play') counts[String(row.seat)] += row.cards.length;
  }
  return counts;
}

// 끝난 트릭을 도메인 상태로 복원한다 (finishOrder·status·nextLead 확보)
export function rebuildEndedState(trick, hands) {
  const rows = [...trick.plays].sort((a, b) => a.turnNo - b.turnNo);
  let state = createTrickState({
    playerOrder: PLAYER_ORDER,
    leaderId: String(trick.leaderSeat),
    handCounts: countsAtStart(hands, rows),
    hands,
  });
  for (const row of rows) {
    state =
      row.action === 'pass'
        ? pass(state, String(row.seat))
        : play(state, String(row.seat), row.cards);
  }
  return state;
}

// 아웃 순서대로 빈 finish_position을 채운다 (기존 기록은 유지)
export function applyFinishPositions(seats, order) {
  let next = seats.filter((s) => s.finishPosition !== null).length + 1;
  for (const id of order) {
    const seat = seats[Number(id)];
    if (seat && seat.finishPosition === null) {
      seat.finishPosition = next;
      next += 1;
    }
  }
}

// 방·손패·최신 트릭·복원 상태를 한 번에 읽는다 (선행 검사 포함)
export async function loadEndedContext(gameRepository, code) {
  const agg = await gameRepository.findGameByCode(code);
  if (!agg) throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
  const hands = (await gameRepository.findHands(agg.game.id)) ?? {};
  const latest = await gameRepository.findLatestTrick(agg.game.id);
  const state = latest ? rebuildEndedState(latest, hands) : null;
  return { ...agg, hands, latest, state };
}
