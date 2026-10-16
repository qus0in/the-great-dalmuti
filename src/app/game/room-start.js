import { createDeck, shuffle } from '../../domain/game/deck.js';
import { deal } from '../../domain/game/deal.js';
import { NotFoundError, ConflictError, ForbiddenError } from './room-errors.js';

function fillEmptyBots(seats) {
  for (const s of seats) {
    if (s.userId === null && !s.isBot) {
      s.isBot = true;
      s.userName = s.userName ?? `봇 ${s.seat}`;
    }
  }
}

function dealHands(rng) {
  const deck = createDeck();
  const shuffled = shuffle(deck, rng.random);
  const dealResult = deal(shuffled, [0, 1, 2, 3]);
  return {
    0: dealResult.hands['0'],
    1: dealResult.hands['1'],
    2: dealResult.hands['2'],
    3: dealResult.hands['3'],
  };
}

function buildStartedPublic({ publicState, game, seats, nowIso }) {
  return {
    ...publicState,
    phase: 'playing',
    version: publicState.version + 1,
    currentTurnSeat: game.hostSeat,
    seatSummary: seats.map((s) => ({
      seat: s.seat,
      userName: s.userName ?? (s.isBot ? `봇 ${s.seat}` : '참가자'),
      isBot: s.isBot,
      cardCount: 20,
    })),
    lastPlay: null,
    updatedAt: nowIso,
  };
}

function assertCanStart(agg, user) {
  if (!agg) throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
  const { game, seats } = agg;
  const host = seats.find((s) => s.seat === game.hostSeat);
  if (!host || host.userId !== user.id) {
    throw new ForbiddenError('Only room host can start game', 'FORBIDDEN');
  }
  if (game.phase !== 'waiting') {
    throw new ConflictError('Game already started', 'CONFLICT');
  }
}

// 게임 시작 유스케이스: 방장만 시작 가능, 빈자리를 봇으로 전환, 덱 분배 및 공개 상태 갱신
export async function startGame(
  {
    gameRepository,
    clock = { now: () => new Date() },
    rng = { random: Math.random },
  },
  { joinCode, user },
) {
  const agg = await gameRepository.findGameByCode(joinCode);
  assertCanStart(agg, user);

  const { game, seats, publicState } = agg;
  fillEmptyBots(seats);
  await gameRepository.saveSeats(game.id, seats);

  const hands = dealHands(rng);
  await gameRepository.saveHands(game.id, hands);

  const nowIso = clock.now().toISOString();
  const nextGame = {
    ...game,
    phase: 'playing',
    version: game.version + 1,
    updatedAt: nowIso,
  };
  const nextPublic = buildStartedPublic({ publicState, game, seats, nowIso });

  await gameRepository.saveGameAndPublic({
    game: nextGame,
    publicState: nextPublic,
    expectedVersion: game.version,
  });

  return { game: nextGame, seats, publicState: nextPublic, hands };
}
