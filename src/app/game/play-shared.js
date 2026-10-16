import { randomUUID } from 'node:crypto';
import { DomainError } from '../../domain/game/cards.js';
import { createTrickState, pass, play } from '../../domain/game/trick.js';
import { ConflictError, ForbiddenError, NotFoundError } from './room-errors.js';

const PLAYER_ORDER = ['0', '1', '2', '3'];

// 공통 선행 검사: 방 존재(404)·진행 중(409)·버전(409)·좌석(403)
export async function loadPlayingRoom(gameRepository, { code, user, version }) {
  const agg = await gameRepository.findGameByCode(code);
  if (!agg) throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
  if (agg.game.phase !== 'playing') {
    throw new ConflictError('Game not playing', 'CONFLICT');
  }
  if (agg.game.version !== version) {
    throw new ConflictError('Stale version', 'STALE_VERSION');
  }
  const seat = agg.seats.find((s) => s.userId === user.id);
  if (!seat) throw new ForbiddenError('Not seated', 'FORBIDDEN');
  return { ...agg, seat: seat.seat };
}

function buildNewTrick(game, publicState) {
  return {
    id: randomUUID(),
    gameId: game.id,
    seq: 1,
    leaderSeat: publicState.currentTurnSeat ?? 0,
    passes: 0,
    winnerSeat: null,
    plays: [],
  };
}

// 저장된 트릭·플레이·손패로 도메인 트릭 상태를 복원한다 (규칙 판정은 도메인 몫)
export async function loadTrickContext({
  gameRepository,
  game,
  publicState,
  hands,
}) {
  const trick =
    (await gameRepository.findCurrentTrick(game.id)) ??
    buildNewTrick(game, publicState);
  const handCounts = Object.fromEntries(
    PLAYER_ORDER.map((s) => [s, hands[Number(s)].length]),
  );
  let state = createTrickState({
    playerOrder: PLAYER_ORDER,
    leaderId: String(trick.leaderSeat),
    handCounts,
    hands,
  });
  const rows = [...trick.plays].sort((a, b) => a.turnNo - b.turnNo);
  for (const row of rows) {
    state =
      row.action === 'pass'
        ? pass(state, String(row.seat))
        : play(state, String(row.seat), row.cards);
  }
  return { trick, state };
}

// 카드 id를 손패의 실제 카드로 바꾼다 (없으면 규칙 위반 422로 매핑)
export function resolveHandCards(hand, cardIds) {
  const cards = [];
  for (const id of cardIds) {
    const card = hand.find((c) => c.id === id);
    if (!card) throw new DomainError('Card not in hand', 'INVALID_PLAY');
    cards.push(card);
  }
  return cards;
}

export function removeCards(hand, cards) {
  const ids = new Set(cards.map((c) => c.id));
  return hand.filter((c) => !ids.has(c.id));
}

// 내기·패스 공통 준비: 선행 검사 + 손패 + 트릭 상태 복원
export async function loadPlayContext(gameRepository, { code, user, version }) {
  const { game, publicState, seat } = await loadPlayingRoom(gameRepository, {
    code,
    user,
    version,
  });
  const hands = await gameRepository.findHands(game.id);
  if (!hands) throw new ConflictError('Hands missing', 'CONFLICT');
  const { trick, state } = await loadTrickContext({
    gameRepository,
    game,
    publicState,
    hands,
  });
  return { game, publicState, seat, hands, trick, state };
}
