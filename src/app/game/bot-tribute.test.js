import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runBotTribute } from './bot-tribute.js';
import { makeTestSeats, setupTributeFixture } from './tribute-test-fixture.js';

// 0·1번(두 달무티)만 봇으로 바꾼 좌석
function botDalmutiSeats() {
  return makeTestSeats().map((s) =>
    s.seat < 2
      ? { ...s, userId: null, userName: `봇 ${s.seat}`, isBot: true }
      : s,
  );
}

const substitutes = (seats) => ({
  isSubstituted: (_code, seat) => seats.includes(seat),
});

describe('Bot tribute execution', () => {
  it('Given both dalmati bots, When runBotTribute, Then lowest cards returned', async () => {
    const { gameRepository } = await setupTributeFixture({
      seatsOverride: botDalmutiSeats(),
    });
    const result = await runBotTribute(
      { gameRepository },
      { code: 'ROOM1', seat: 0 },
    );

    assert.equal(result.acted, true);
    assert.equal(result.game.phase, 'playing');
    assert.equal(result.game.version, 2);
    assert.deepEqual(
      result.returns.대달무티.map((c) => c.id),
      ['rank-10-1', 'rank-11-1'],
    );
    assert.deepEqual(
      result.returns.소달무티.map((c) => c.id),
      ['rank-10-2'],
    );
    assert.ok(result.hands[0].some((c) => c.rank === 1));
    assert.ok(result.hands[3].some((c) => c.rank === 10));
  });
});

describe('Bot tribute boundaries', () => {
  it('Given human dalmati, When runBotTribute, Then no action', async () => {
    const { gameRepository } = await setupTributeFixture();
    const result = await runBotTribute(
      { gameRepository },
      { code: 'ROOM1', seat: 0 },
    );
    assert.equal(result.acted, false);
  });

  it('Given non-tribute phase, When runBotTribute, Then no action', async () => {
    const { gameRepository } = await setupTributeFixture({
      phase: 'playing',
      seatsOverride: botDalmutiSeats(),
    });
    const result = await runBotTribute(
      { gameRepository },
      { code: 'ROOM1', seat: 0 },
    );
    assert.equal(result.acted, false);
  });
});

describe('Bot tribute delegation and peon guard', () => {
  it('Given bot peon seat, When runBotTribute, Then no action', async () => {
    const seats = makeTestSeats().map((s) =>
      s.seat === 2 ? { ...s, userId: null, isBot: true } : s,
    );
    const { gameRepository } = await setupTributeFixture({
      seatsOverride: seats,
    });
    const result = await runBotTribute(
      { gameRepository },
      { code: 'ROOM1', seat: 2 },
    );
    assert.equal(result.acted, false);
  });

  it('Given substituted dalmati, When runBotTribute, Then acts for them', async () => {
    const { gameRepository } = await setupTributeFixture();
    const result = await runBotTribute(
      { gameRepository, substitutions: substitutes([0, 1]) },
      { code: 'ROOM1', seat: 0 },
    );
    assert.equal(result.acted, true);
    assert.equal(result.game.version, 2);
  });
});
