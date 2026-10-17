import { randomUUID } from 'node:crypto';

function defaultJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildInitialSeats(gameId, hostUser) {
  const seats = [];
  for (let seat = 0; seat < 4; seat += 1) {
    const isHost = seat === 0;
    seats.push({
      gameId,
      seat,
      userId: isHost ? hostUser.id : null,
      userName: isHost ? (hostUser.name ?? '호스트') : null,
      isBot: false,
      finishPosition: null,
      leftAt: null,
    });
  }
  return seats;
}

function buildInitialPublic(gameId, hostName, nowIso) {
  return {
    gameId,
    phase: 'waiting',
    version: 1,
    currentTurnSeat: null,
    seatSummary: [{ seat: 0, userName: hostName, isBot: false, cardCount: 0 }],
    lastPlay: null,
    updatedAt: nowIso,
  };
}

// 방 생성 유스케이스: 호스트를 0번 좌석에 배정하고 대기실 방을 만든다
export async function createRoom(
  { gameRepository, clock = { now: () => new Date() }, rng = {} },
  { hostUser, mode = 'normal' },
) {
  const gameId = randomUUID();
  const joinCode = rng.generateJoinCode
    ? rng.generateJoinCode()
    : defaultJoinCode();
  const nowIso = clock.now().toISOString();

  const game = {
    id: gameId,
    mode,
    joinCode,
    phase: 'waiting',
    version: 1,
    hostSeat: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const seats = buildInitialSeats(gameId, hostUser);
  const publicState = buildInitialPublic(
    gameId,
    hostUser.name ?? '호스트',
    nowIso,
  );
  publicState.mode = mode;
  await gameRepository.createGame({ game, seats, publicState });

  return { game, seats, publicState };
}
