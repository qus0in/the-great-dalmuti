import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCard, DomainError } from './cards.js';
import {
  canDeclareRevolution,
  declareRevolution,
  invertSeats,
} from './revolution.js';

const sampleSeats = () => [
  { id: 'p1', rank: '대달무티' },
  { id: 'p2', rank: '소달무티' },
  { id: 'p3', rank: '소농노' },
  { id: 'p4', rank: '대농노' },
];

describe('Revolution eligibility and seat inversion', () => {
  it('Given hands, When checking eligibility, Then requires 2 jesters', () => {
    const j1 = createCard(13, 1);
    const j2 = createCard(13, 2);
    assert.equal(canDeclareRevolution([j1, j2]), true);
    assert.equal(canDeclareRevolution([j1]), false);
    assert.equal(canDeclareRevolution([]), false);
  });

  it('Given seat map, When invertSeats called, Then ranks are swapped', () => {
    const map = { p1: '대달무티', p2: '소달무티', p3: '소농노', p4: '대농노' };
    const inv = invertSeats(map);
    assert.deepEqual(inv, {
      p1: '대농노',
      p2: '소농노',
      p3: '소달무티',
      p4: '대달무티',
    });
  });
});

describe('Normal and greater revolution declarations', () => {
  it('Given non-peon holding 2 jesters, When declaring, Then skips tribute with same seats', () => {
    const hand = [createCard(13, 1), createCard(13, 2)];
    const seats = sampleSeats();
    const res = declareRevolution({
      declarer: 'p2',
      seatRank: '소달무티',
      hand,
      seats,
    });
    assert.equal(res.isRevolution, true);
    assert.equal(res.isGreaterRevolution, false);
    assert.equal(res.skipTribute, true);
    assert.deepEqual(res.seats, seats);
  });

  it('Given 대농노 holding 2 jesters, When declaring, Then triggers 대혁명 with inverted seats', () => {
    const hand = [createCard(13, 1), createCard(13, 2)];
    const res = declareRevolution({
      declarer: 'p4',
      seatRank: '대농노',
      hand,
      seats: sampleSeats(),
    });
    assert.equal(res.isGreaterRevolution, true);
    assert.equal(res.skipTribute, true);
    assert.equal(res.seats[0].rank, '대농노');
    assert.equal(res.seats[3].rank, '대달무티');
  });
});

describe('Revolution validation errors', () => {
  it('Given invalid hand or invalid phase, When declaring revolution, Then throws DomainError', () => {
    const j1 = [createCard(13, 1), createCard(1, 1)];
    const j2 = [createCard(13, 1), createCard(13, 2)];
    assert.throws(
      () => declareRevolution({ hand: j1, seatRank: '대농노' }),
      (err) => err instanceof DomainError && err.code === 'NOT_ENOUGH_JESTERS',
    );
    assert.throws(
      () => declareRevolution({ hand: j2, seatRank: '대농노', phase: 'play' }),
      (err) => err instanceof DomainError && err.code === 'INVALID_PHASE',
    );
  });
});
