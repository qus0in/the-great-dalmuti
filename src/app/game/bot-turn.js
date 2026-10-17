import { chooseBotPlay } from '../../domain/game/hint.js';
import { passTurnAsSeat, playCardsAsSeat } from './play-actions.js';
import { loadTrickContext } from './play-shared.js';

// 대행 표시 없음 기본값: 레지스트리 없이도 봇 좌석 판정만으로 동작한다
const noSubstitutions = { isSubstituted: () => false };

// 현재 차례 좌석이 봇(빈자리·싱글)인지 판단한다
function isBotSeat(seats, turnSeat) {
  const seat = seats.find((s) => s.seat === turnSeat);
  return seat !== undefined && (seat.isBot === true || seat.userId === null);
}

// 선택 실행: 내기·패스를 좌석 지정으로 실행한다
async function executeChoice(
  { gameRepository },
  { code, seat, choice, version },
) {
  if (choice.action === 'play') {
    await playCardsAsSeat(
      { gameRepository },
      { code, seat, cards: choice.cards, version },
    );
    return { acted: true, action: 'play' };
  }
  await passTurnAsSeat({ gameRepository }, { code, seat, version });
  return { acted: true, action: 'pass' };
}

// 봇 차례 실행: 봇 좌석·대행 좌석이면 선택 후 좌석 지정 실행, 사람 차례면 무동작
// substitutions는 U8 레지스트리를 인자로 받는다. 조공 단계는 좌석 지정 실행이
// 없어서 아무것도 안 한다 (tribute-* 수정 금지 — 경계로 보고)
export async function runBotTurn(
  { gameRepository, substitutions = noSubstitutions },
  { code },
) {
  const agg = await gameRepository.findGameByCode(code);
  if (!agg || agg.game.phase !== 'playing') return { acted: false };
  const { currentTurnSeat: turnSeat } = agg.publicState;
  const bot = isBotSeat(agg.seats, turnSeat);
  const delegated = substitutions.isSubstituted(code, turnSeat);
  if (!bot && !delegated) return { acted: false };
  const hands = await gameRepository.findHands(agg.game.id);
  const { state } = await loadTrickContext({
    gameRepository,
    game: agg.game,
    publicState: agg.publicState,
    hands,
  });
  const choice = chooseBotPlay(hands[turnSeat], state.trick.lastPlay);
  return executeChoice(
    { gameRepository },
    { code, seat: turnSeat, choice, version: agg.game.version },
  );
}
