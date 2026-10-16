import { createRoom } from '../../app/game/room-create.js';
import { joinRoom } from '../../app/game/room-join.js';
import { startGame } from '../../app/game/room-start.js';
import { ForbiddenError, NotFoundError } from '../../app/game/room-errors.js';
import { wrap } from './wrap.js';

// POST /api/rooms — 호스트가 대기실을 만든다 (201)
export function createRoomHandler({ repository, clock, rng }) {
  return wrap(async (req, res) => {
    const result = await createRoom(
      { gameRepository: repository, clock, rng },
      { hostUser: req.authUser },
    );
    res.status(201).json({
      game: result.game,
      seats: result.seats,
      publicState: result.publicState,
    });
  });
}

// POST /api/rooms/:code/join — 빈 좌석 배정, 가득 참이면 409
export function joinRoomHandler({ repository, clock }) {
  return wrap(async (req, res) => {
    const result = await joinRoom(
      { gameRepository: repository, clock },
      { joinCode: req.params.code, user: req.authUser },
    );
    res.json({
      game: result.game,
      seat: result.seat,
      publicState: result.publicState,
    });
  });
}

// GET /api/rooms/:code — 공개 상태 + 요청자 본인 손패만
export function getRoomHandler({ repository }) {
  return wrap(async (req, res) => {
    const agg = await repository.findGameByCode(req.params.code);
    if (!agg) throw new NotFoundError('Room not found', 'ROOM_NOT_FOUND');
    const seat = agg.seats.find((s) => s.userId === req.authUser.id);
    if (!seat) throw new ForbiddenError('Not seated', 'FORBIDDEN');
    const hands = await repository.findHands(agg.game.id);
    res.json({
      publicState: agg.publicState,
      hand: (hands && hands[seat.seat]) || [],
    });
  });
}

// POST /api/rooms/:code/start — 방장만 시작, 빈자리는 봇으로 채운다 (200)
export function startGameHandler({ repository, clock, rng }) {
  return wrap(async (req, res) => {
    const result = await startGame(
      { gameRepository: repository, clock, rng },
      { joinCode: req.params.code, user: req.authUser },
    );
    res.json({ game: result.game, publicState: result.publicState });
  });
}
