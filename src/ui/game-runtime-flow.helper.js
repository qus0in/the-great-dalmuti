import { call } from './game/test-app.js';
import { USERS, chooseMove } from './game-flow.helper.js';
import { CODE, startRuntimeFlowApp } from './game-runtime-flow-app.js';

export { CODE, startRuntimeFlowApp };
const CARD_ID = /"(rank-\d+-\d+|jester-\d+)"/;

const request = (app, path, opts = {}) =>
  call(app.baseUrl, `/api/rooms/${CODE}${path}`, opts);

const roomGet = (app, userId) => request(app, '', { userId });

const command = (app, { path, userId, body }) =>
  request(app, `/${path}`, { method: 'POST', userId, body });

async function currentTrick(app) {
  const agg = await app.repository.findGameByCode(CODE);
  return app.repository.findCurrentTrick(agg.game.id);
}

async function act(app, { userId, room, previous }) {
  const move = chooseMove(room.hand, previous);
  const res = move
    ? await command(app, {
        path: 'plays',
        userId,
        body: {
          version: room.publicState.version,
          cards: move.map((c) => c.id),
        },
      })
    : await command(app, {
        path: 'pass',
        userId,
        body: { version: room.publicState.version },
      });
  const body = res.body ?? {};
  const leaks =
    ('hands' in body ? 1 : 0) + (CARD_ID.test(JSON.stringify(body)) ? 1 : 0);
  return { res, leaks };
}

async function takeStep(app, state) {
  const userId = USERS[state.currentTurnSeat];
  const room = await roomGet(app, userId);
  const open = await currentTrick(app);
  const previous =
    open && open.plays.length > 0 ? room.body.publicState.lastPlay : null;
  const { res, leaks } = await act(app, { userId, room: room.body, previous });
  if (res.status !== 200) {
    return {
      requests: 2,
      leaks,
      error: `action ${userId} ${res.status} ${res.body?.code ?? ''}`,
    };
  }
  return {
    requests: 2,
    leaks,
    trickEnded: Boolean(res.body.trickEnded),
    finished:
      Boolean(res.body.roundEnded) || res.body.publicState.phase === 'finished',
    state: res.body.publicState,
  };
}

// 사람 차례만 HTTP로 진행한다. 봇 차례는 명령 후 런타임이 자동 처리하므로
// currentTurnSeat이 봇으로 남으면 그 자체가 배선 실패 신호다.
export async function driveRound(app, { max = 400 } = {}) {
  const log = { requests: 0, tricks: 0, leaks: 0, turns: [] };
  let state = (await roomGet(app, 'u0')).body.publicState;
  while (log.requests < max && state.currentTurnSeat !== null) {
    log.turns.push(state.currentTurnSeat);
    const step = await takeStep(app, state);
    log.requests += step.requests;
    log.leaks += step.leaks;
    log.tricks += step.trickEnded ? 1 : 0;
    if (step.error) return { log, state, error: step.error };
    if (step.finished) return { log, state: step.state, roundEnded: true };
    state = step.state;
  }
  const error =
    state.currentTurnSeat === null ? 'no turn' : 'request cap reached';
  return { log, state, error };
}
