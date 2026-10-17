import { it } from 'node:test';
import assert from 'node:assert/strict';
import * as flow from './game-flow.helper.js';
async function prepare(app) {
  await flow.createRoom(app.baseUrl);
  for (const id of ['u1', 'u2', 'u3']) await flow.joinRoom(app.baseUrl, id);
  return (await flow.startRoom(app.baseUrl)).body.publicState;
}

async function takeTurn(app, state, trickEnded) {
  const userId = flow.USERS[state.currentTurnSeat];
  const { body } = await flow.getRoom(app.baseUrl, userId);
  const previous = trickEnded ? null : body.publicState.lastPlay;
  const move = flow.chooseMove(body.hand, previous);
  const response = move
    ? await flow.playCards(app.baseUrl, userId, {
        version: body.publicState.version,
        cards: move.map((c) => c.id),
      })
    : await flow.passTurn(app.baseUrl, userId, body.publicState.version);
  return {
    userId,
    action: move ? `play r${move[0].rank}x${move.length}` : 'pass',
    response,
  };
}
async function driveRound(app, maxRequests = 500) {
  const log = { requests: 0, tricks: 0, steps: [] };
  const update = (turn) => {
    const { status, body } = turn.response;
    log.requests += 2;
    log.tricks += body?.trickEnded ? 1 : 0;
    log.steps.push(
      `${turn.userId} ${turn.action} -> ${status} ${body?.code ?? ''}`,
    );
  };
  let state = await prepare(app);
  let trickEnded = false;
  while (log.requests < maxRequests) {
    const turn = await takeTurn(app, state, trickEnded);
    update(turn);
    const { status, body } = turn.response;
    if (status !== 200)
      return {
        log,
        error: `action ${turn.userId} ${status} ${body?.code ?? ''}`,
      };
    if (body.roundEnded)
      return { log, state: body.publicState, roundEnded: true };
    state = body.publicState;
    trickEnded = body.trickEnded;
    if (state.currentTurnSeat === null) return { log, state, error: 'no turn' };
  }
  return { log, state, error: 'request cap reached' };
}
it('Given four humans, When round played, Then finished with ranks 1-4', async () => {
  const app = await flow.startFlowApp();
  try {
    const result = await driveRound(app);
    const log = `${result.error ?? 'ok'} ${JSON.stringify(result.log)}`;
    assert.ok(!result.error, `flow blocked: ${log}`);
    assert.equal(result.roundEnded, true, `round not ended: ${log}`);
    const room = await flow.getRoom(app.baseUrl, 'u0');
    assert.equal(room.body.publicState.phase, 'finished', log);
    const agg = await app.repository.findGameByCode(flow.JOIN_CODE);
    const ranks = agg.seats.map((s) => s.finishPosition).sort((a, b) => a - b);
    assert.deepEqual(ranks, [1, 2, 3, 4], log);
  } finally {
    await app.close();
  }
});
it('Given started room, When off-turn or reading, Then 409 and own hand only', async () => {
  const app = await flow.startFlowApp();
  try {
    const state = await prepare(app);
    const { body: roomBody } = await flow.getRoom(app.baseUrl, 'u1');
    const offTurn = await flow.playCards(app.baseUrl, 'u1', {
      version: state.version,
      cards: [roomBody.hand[0].id],
    });
    assert.deepEqual(
      [offTurn.status, offTurn.body.code],
      [409, 'NOT_YOUR_TURN'],
    );

    const agg = await app.repository.findGameByCode(flow.JOIN_CODE);
    const hands = await app.repository.findHands(agg.game.id);
    for (const [seat, userId] of flow.USERS.entries()) {
      const { body } = await flow.getRoom(app.baseUrl, userId);
      assert.deepEqual(body, {
        publicState: agg.publicState,
        hand: hands[seat],
        hint: null,
        lastSubstitution: null,
      });
    }
  } finally {
    await app.close();
  }
});
