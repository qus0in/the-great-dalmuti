import { suggestPlay } from '../../domain/game/hint.js';
import { loadTrickContext } from './play-shared.js';

// 조회에 사용한 상태를 재사용하고, 추천에는 요청자 손패만 전달한다.
export async function getRoomHint(
  { gameRepository },
  { game, publicState, hands, seat },
) {
  if (game.mode !== 'tutorial' || game.phase !== 'playing') return null;
  if (publicState.currentTurnSeat !== seat) return null;
  const hand = hands?.[seat] ?? [];
  if (hand.length === 0) return null;
  const { state } = await loadTrickContext({
    gameRepository,
    game,
    publicState,
    hands,
  });
  if (state.turnId !== String(seat) || state.status !== 'in-progress')
    return null;
  return suggestPlay({
    hand,
    lastPlay: state.trick.lastPlay,
    isLeader: state.trick.lastPlay === null,
    revolution: publicState.revolution,
  });
}
