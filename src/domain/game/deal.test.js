import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from './deck.js';
import { deal } from './deal.js';
import { DomainError } from './cards.js';

describe('Dealing cards clockwise from 대달무티', () => {
  it('Given 80-card deck and 4 seats, When deal is called, Then 4 hands of 20 cards are dealt clockwise starting from 대달무티', () => {
    const deck = createDeck();
    const seatOrder = ['소달무티', '소농노', '대농노', '대달무티'];

    const result = deal(deck, seatOrder);

    assert.ok(result.hands);
    assert.equal(result.hands['대달무티'].length, 20);
    assert.equal(result.hands['소달무티'].length, 20);
    assert.equal(result.hands['소농노'].length, 20);
    assert.equal(result.hands['대농노'].length, 20);

    assert.strictEqual(result.hands['대달무티'][0], deck[0]);
    assert.strictEqual(result.hands['소달무티'][0], deck[1]);
    assert.strictEqual(result.hands['소농노'][0], deck[2]);
    assert.strictEqual(result.hands['대농노'][0], deck[3]);
    assert.strictEqual(result.hands['대달무티'][1], deck[4]);

    const allDealt = [
      ...result.hands['대달무티'],
      ...result.hands['소달무티'],
      ...result.hands['소농노'],
      ...result.hands['대농노'],
    ];
    assert.equal(allDealt.length, 80);
  });
});

describe('Deal validation and identification', () => {
  it('Given seat objects with seatId and rank, When deal is called, Then dealing correctly identifies 대달무티 seat', () => {
    const deck = createDeck();
    const seatOrder = [
      { seatId: 'seat-1', rank: '소달무티' },
      { seatId: 'seat-2', rank: '대달무티' },
      { seatId: 'seat-3', rank: '소농노' },
      { seatId: 'seat-4', rank: '대농노' },
    ];

    const result = deal(deck, seatOrder);

    assert.equal(result.hands['seat-2'].length, 20);
    assert.strictEqual(result.hands['seat-2'][0], deck[0]);
    assert.strictEqual(result.hands['seat-3'][0], deck[1]);
  });

  it('Given invalid deck or invalid seatOrder, When deal is called, Then DomainError is thrown', () => {
    const validDeck = createDeck();
    const shortDeck = validDeck.slice(0, 40);
    const validSeats = ['s1', 's2', 's3', 's4'];

    assert.throws(
      () => deal(shortDeck, validSeats),
      (err) => err instanceof DomainError && err.code === 'INVALID_DECK',
    );
    assert.throws(
      () => deal(validDeck, ['s1', 's2']),
      (err) => err instanceof DomainError && err.code === 'INVALID_SEAT_ORDER',
    );
  });
});
