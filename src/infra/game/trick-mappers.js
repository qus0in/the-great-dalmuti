// 트릭(game_tricks) 및 트릭 플레이(game_trick_plays) 매핑 순수 함수

export function trickToRow(trick) {
  return {
    id: trick.id,
    game_id: trick.gameId,
    seq: trick.seq,
    leader_seat: trick.leaderSeat,
    passes: trick.passes,
    winner_seat: trick.winnerSeat ?? null,
  };
}

export function playToRow(trickId, play) {
  return {
    trick_id: trickId,
    turn_no: play.turnNo,
    seat: play.seat,
    action: play.action,
    cards: play.cards ?? [],
  };
}

export function rowToTrick(row, playRows = []) {
  const plays = playRows.map((p) => ({
    turnNo: p.turn_no,
    seat: p.seat,
    action: p.action,
    cards: p.cards ?? [],
  }));
  plays.sort((a, b) => a.turnNo - b.turnNo);
  return {
    id: row.id,
    gameId: row.game_id,
    seq: row.seq,
    leaderSeat: row.leader_seat,
    passes: row.passes,
    winnerSeat: row.winner_seat ?? null,
    plays,
  };
}
