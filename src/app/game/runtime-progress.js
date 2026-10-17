import { runBotTurn } from './bot-turn.js';
import { runBotTribute } from './bot-tribute.js';
import { resolveRankings } from './runtime-stats.js';
const MAX_STEPS = 64;
function isControlled(seat, code, substitutions) {
  return (
    Boolean(seat.isBot) ||
    seat.userId === null ||
    substitutions.isSubstituted(code, seat.seat)
  );
}
async function advanceTribute(deps, code, agg) {
  for (const seat of agg.seats) {
    if (!isControlled(seat, code, deps.substitutions)) continue;
    const acted = await runBotTribute(
      {
        gameRepository: deps.gameRepository,
        substitutions: deps.substitutions,
      },
      { code, seat: seat.seat },
    );
    if (acted.acted) return true;
  }
  return false;
}
function armTimer(rooms, code, agg) {
  const { currentTurnSeat } = agg.publicState;
  if (
    agg.game.phase !== 'playing' ||
    agg.game.mode === 'tutorial' ||
    currentTurnSeat === null
  ) {
    rooms.timerOf(code).cancel();
    return;
  }
  rooms.timerOf(code).arm(code, agg.game.version, currentTurnSeat);
}
async function handleFinished(deps, code, { merged, agg }) {
  deps.rooms.timerOf(code).cancel();
  await deps.recordStats(code, merged);
  const rankings = resolveRankings(merged, agg);
  return rankings ? { ...merged, rankings } : merged;
}
function continueStep(deps, code, merged) {
  setImmediate(() =>
    deps.rooms.enqueue(code, () => runStep(deps, code, merged)),
  );
  return merged;
}
async function step(deps, code, result) {
  const { gameRepository, substitutions, rooms } = deps;
  let merged = { ...result };
  for (let i = 0; i < MAX_STEPS; i += 1) {
    const agg = await gameRepository.findGameByCode(code);
    if (!agg) {
      rooms.timerOf(code).cancel();
      return merged;
    }
    merged = { ...merged, game: agg.game, publicState: agg.publicState };
    if (agg.game.phase === 'finished') {
      return handleFinished(deps, code, { merged, agg });
    }
    if (agg.game.phase === 'playing') {
      const acted = await runBotTurn(
        { gameRepository, substitutions },
        { code },
      );
      if (!acted?.acted) {
        armTimer(rooms, code, agg);
        return merged;
      }
      continue;
    }
    if (await advanceTribute(deps, code, agg)) continue;
    rooms.timerOf(code).cancel();
    return merged;
  }
  return continueStep(deps, code, merged);
}
async function runStep(deps, code, result) {
  try {
    return await step(deps, code, result);
  } catch (err) {
    deps.onError(err, { code });
    return result;
  }
}
async function expire(deps, code, seat) {
  try {
    await deps.expiry(code, seat);
    await step(deps, code, {});
  } catch (err) {
    deps.onError(err, { code, seat });
  }
}
export const createProgress = (deps) => ({
  step: (code, result) => runStep(deps, code, result),
  expire: (code, seat) => expire(deps, code, seat),
});
