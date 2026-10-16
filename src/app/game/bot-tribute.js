import { selectTributeCards } from '../../domain/game/tribute.js';
import { submitTributeAsSeat } from './tribute-actions.js';
import { buildRankMap } from './tribute-hands.js';
import {
  RANK_GREATER_DALMUTI,
  RANK_LESSER_DALMUTI,
  resolveSeatRank,
} from './tribute-shared.js';

// 대행 표시 없음 기본값: 레지스트리 없이도 봇 좌석 판정만으로 동작한다
const noSubstitutions = { isSubstituted: () => false };

function isBotSeat(seat) {
  return seat.isBot === true || seat.userId === null;
}

function isControlled(seat, code, substitutions) {
  return isBotSeat(seat) || substitutions.isSubstituted(code, seat.seat);
}

// 조공 주체와 두 달무티 좌석을 찾는다. 주체가 달무티가 아니면 null
function findTributeSeats(agg, seatNo) {
  const actor = agg.seats.find((s) => s.seat === seatNo);
  if (!actor) return null;
  const rank = resolveSeatRank(actor);
  if (rank !== RANK_GREATER_DALMUTI && rank !== RANK_LESSER_DALMUTI) {
    return null;
  }
  const rankToSeat = buildRankMap(agg.seats);
  const gdSeat = rankToSeat[RANK_GREATER_DALMUTI];
  const ldSeat = rankToSeat[RANK_LESSER_DALMUTI];
  if (gdSeat === undefined || ldSeat === undefined) return null;
  return {
    actor,
    gd: agg.seats.find((s) => s.seat === gdSeat),
    ld: agg.seats.find((s) => s.seat === ldSeat),
    gdSeat,
    ldSeat,
  };
}

// 봇은 규칙상 가장 낮은 카드를 돌려준다 (도메인 selectTributeCards 재사용)
function chooseReturns(hands, gdSeat, ldSeat) {
  return {
    [RANK_GREATER_DALMUTI]: selectTributeCards(hands[gdSeat] ?? [], 2),
    [RANK_LESSER_DALMUTI]: selectTributeCards(hands[ldSeat] ?? [], 1),
  };
}

// 봇·대행 좌석의 조공 실행. 두 달무티 좌석이 모두 봇/대행일 때만 동작한다
// (사람 달무티의 선택을 대신하지 않는다 — 단일 호출자 계약의 경계, 보고 참조)
export async function runBotTribute(
  { gameRepository, substitutions = noSubstitutions },
  { code, seat },
) {
  const agg = await gameRepository.findGameByCode(code);
  if (!agg) return { acted: false };
  const { phase } = agg.game;
  if (phase !== 'tribute' && phase !== 'before_tribute')
    return { acted: false };

  const found = findTributeSeats(agg, seat);
  if (!found) return { acted: false };
  const controlled = [found.actor, found.gd, found.ld].every(
    (s) => s && isControlled(s, code, substitutions),
  );
  if (!controlled) return { acted: false };

  const hands = await gameRepository.findHands(agg.game.id);
  if (!hands) return { acted: false };
  const returns = chooseReturns(hands, found.gdSeat, found.ldSeat);
  const result = await submitTributeAsSeat(
    { gameRepository },
    { code, seat, returns, version: agg.game.version },
  );
  return { acted: true, returns, ...result };
}
