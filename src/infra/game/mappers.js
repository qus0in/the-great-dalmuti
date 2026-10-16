// 정규화 DB 행(snake_case)과 도메인/앱 엔티티(camelCase) 간의 순수 매핑 함수

export function gameToRow(game) {
  return {
    id: game.id,
    join_code: game.joinCode,
    phase: game.phase,
    version: game.version,
    host_seat: game.hostSeat,
    created_at: game.createdAt,
    updated_at: game.updatedAt,
  };
}

export function rowToGame(row) {
  return {
    id: row.id,
    joinCode: row.join_code,
    phase: row.phase,
    version: row.version,
    hostSeat: row.host_seat,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function seatToRow(seat) {
  return {
    game_id: seat.gameId,
    seat: seat.seat,
    user_id: seat.userId ?? null,
    is_bot: Boolean(seat.isBot),
    finish_position: seat.finishPosition ?? null,
    left_at: seat.leftAt ?? null,
  };
}

export function rowToSeat(row) {
  return {
    gameId: row.game_id,
    seat: row.seat,
    userId: row.user_id ?? null,
    userName: row.user_name ?? null,
    isBot: Boolean(row.is_bot),
    finishPosition: row.finish_position ?? null,
    leftAt: row.left_at ?? null,
  };
}

export function publicToRow(pub) {
  return {
    game_id: pub.gameId,
    phase: pub.phase,
    version: pub.version,
    current_turn_seat: pub.currentTurnSeat ?? null,
    seat_summary: pub.seatSummary ?? [],
    last_play: pub.lastPlay ?? null,
    updated_at: pub.updatedAt,
  };
}

export function rowToPublic(row) {
  return {
    gameId: row.game_id,
    phase: row.phase,
    version: row.version,
    currentTurnSeat: row.current_turn_seat ?? null,
    seatSummary: row.seat_summary ?? [],
    lastPlay: row.last_play ?? null,
    updatedAt: row.updated_at,
  };
}

export function handsToRows(gameId, hands) {
  return Object.entries(hands).map(([seat, cards]) => ({
    game_id: gameId,
    seat: Number(seat),
    cards: cards ?? [],
  }));
}

export function rowsToHands(rows) {
  const result = {};
  for (const row of rows) {
    result[row.seat] = row.cards ?? [];
  }
  return result;
}
