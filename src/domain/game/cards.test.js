import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_DEFINITIONS,
  RANK_NAMES,
  JESTER_RANK,
  JESTER_COUNT,
  TOTAL_CARD_COUNT,
  createCard,
  DomainError,
} from './cards.js';

describe('Cards definitions and counts', () => {
  it('Given rank constants, When inspecting card definitions, Then counts match rank and total is 80', () => {
    let total = 0;
    for (let r = 1; r <= 12; r += 1) {
      const def = CARD_DEFINITIONS.find((item) => item.rank === r);
      assert.ok(def, `Definition for rank ${r} must exist`);
      assert.equal(def.count, r);
      assert.equal(def.name, RANK_NAMES[r]);
      assert.equal(def.isJester, false);
      total += def.count;
    }

    const jesterDef = CARD_DEFINITIONS.find(
      (item) => item.rank === JESTER_RANK,
    );
    assert.ok(jesterDef);
    assert.equal(jesterDef.count, JESTER_COUNT);
    assert.equal(jesterDef.name, '어릿광대');
    assert.equal(jesterDef.isJester, true);
    total += jesterDef.count;

    assert.equal(total, TOTAL_CARD_COUNT);
    assert.equal(total, 80);
  });
});

describe('Card creation and validation', () => {
  it('Given valid rank and index, When createCard is called, Then card object with stable ID is returned', () => {
    const dalmuti = createCard(1, 1);
    const jester = createCard(13, 1);

    assert.deepEqual(dalmuti, {
      id: 'rank-1-1',
      rank: 1,
      name: '대달무티',
      isJester: false,
    });
    assert.deepEqual(jester, {
      id: 'jester-1',
      rank: 13,
      name: '어릿광대',
      isJester: true,
    });
  });

  it('Given invalid rank, When createCard is called, Then DomainError is thrown', () => {
    assert.throws(
      () => createCard(0, 1),
      (err) => err instanceof DomainError && err.code === 'INVALID_CARD_RANK',
    );
    assert.throws(
      () => createCard(14, 1),
      (err) => err instanceof DomainError && err.code === 'INVALID_CARD_RANK',
    );
  });
});
