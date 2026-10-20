import { it } from 'node:test';
import assert from 'node:assert/strict';
import { buildNextTributeEntities } from './tribute-hands.js';
import { applyFinishPositions } from './round-support.js';

const finishedSeats = () =>
  [0, 1, 2, 3].map((seat) => ({
    seat,
    userId: `u${seat}`,
    isBot: false,
    finishPosition: seat + 1,
  }));

it('Given tribute done, When summary built, Then keeps positions', () => {
  const seats = finishedSeats();
  const agg = {
    game: { id: 'g1', phase: 'tribute', version: 2, hostSeat: 0 },
    seats,
    publicState: { phase: 'tribute', version: 2, seatSummary: [] },
  };
  const { nextPublic } = buildNextTributeEntities({
    agg,
    nextHands: { 0: [1], 1: [2], 2: [3], 3: [4] },
    nowIso: '2026-10-20T00:00:00.000Z',
  });
  assert.deepEqual(
    nextPublic.seatSummary.map((s) => s.finishPosition),
    [1, 2, 3, 4],
  );
});

it('Given retained positions, When next round outs, Then restarts at one', () => {
  const seats = finishedSeats();
  const updated = applyFinishPositions(seats, ['2']);
  assert.deepEqual(
    updated.map((s) => s.finishPosition),
    [null, null, 1, null],
  );
  assert.deepEqual(
    seats.map((s) => s.finishPosition),
    [1, 2, 3, 4],
  );
  const second = applyFinishPositions(updated, ['0']);
  assert.deepEqual(
    second.map((s) => s.finishPosition),
    [2, null, 1, null],
  );
});

it('Given single round in progress, When applied, Then keeps order', () => {
  const seats = [
    { seat: 0, finishPosition: null },
    { seat: 1, finishPosition: 1 },
    { seat: 2, finishPosition: null },
  ];
  const updated = applyFinishPositions(seats, ['2', '0']);
  assert.deepEqual(
    updated.map((s) => s.finishPosition),
    [3, 1, 2],
  );
});
