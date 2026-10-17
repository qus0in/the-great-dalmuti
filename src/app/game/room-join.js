import { NotFoundError, ConflictError, ForbiddenError } from './room-errors.js';

function buildSeatSummary(seats) {
  return seats
    .filter((s) => s.userId !== null || s.isBot)
    .map((s) => ({
      seat: s.seat,
      userName: s.userName ?? (s.isBot ? `봇 ${s.seat}` : '참가자'),
      isBot: s.isBot,
      cardCount: 0,
    }));
}

function assertJoinAllowed(game) {
  if (game.mode === 'tutorial')
    throw new ForbiddenError('Tutorial is host only', 'TUTORIAL_ONLY_HOST');
}

// 방 참가 유스케이스: 빈 좌석(0~3)을 찾아 사용자를 배정하고 공개 상태를 갱신한다
export async function joinRoom(
  { gameRepository, clock = { now: () => new Date() } },
  { joinCode, user },
) {
  const agg = await gameRepository.findGameByCode(joinCode);
  if (!agg) throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
  const { game, seats, publicState } = agg;
  if (game.phase !== 'waiting')
    throw new ConflictError('Game already started', 'CONFLICT');

  const existingSeat = seats.find((s) => s.userId === user.id);
  if (existingSeat)
    return { game, seat: existingSeat.seat, seats, publicState };

  assertJoinAllowed(game);

  const emptySeat = seats.find((s) => s.userId === null && !s.isBot);
  if (!emptySeat) throw new ConflictError('Room is full', 'ROOM_FULL');

  emptySeat.userId = user.id;
  emptySeat.userName = user.name ?? `플레이어 ${emptySeat.seat}`;
  await gameRepository.saveSeats(game.id, seats);

  const nextPublic = {
    ...publicState,
    seatSummary: buildSeatSummary(seats),
    updatedAt: clock.now().toISOString(),
  };
  await gameRepository.saveGameAndPublic({
    game,
    publicState: nextPublic,
    expectedVersion: game.version,
  });

  return { game, seat: emptySeat.seat, seats, publicState: nextPublic };
}
