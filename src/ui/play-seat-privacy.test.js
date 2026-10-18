import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createSeatPrivacy } from './public/js/play-seat-privacy.js';

function createClient(queries) {
  return {
    from: (table) => ({
      select: (columns) => ({
        in: (column, ids) => {
          queries.push({ table, columns, column, ids });
          return { data: [{ user_id: 'hidden-user' }] };
        },
      }),
    }),
  };
}

function room() {
  return {
    phase: 'playing',
    seatSummary: [
      { seat: 0, userId: 'hidden-user', isBot: false },
      { seat: 1, userId: null, isBot: true },
    ],
  };
}

it('fetches hidden IDs only when the seat composition changes', async () => {
  const queries = [];
  const sb = createClient(queries);
  const privacy = createSeatPrivacy();
  const initial = room();
  await privacy.update(sb, initial);
  await privacy.update(sb, { ...initial, phase: 'finished' });
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0], {
    table: 'hidden_profiles',
    columns: 'user_id',
    column: 'user_id',
    ids: ['hidden-user'],
  });
  assert.equal(privacy.hiddenIdsFor(initial).has('hidden-user'), true);

  await privacy.update(sb, {
    ...initial,
    seatSummary: [...initial.seatSummary, { seat: 2, userId: 'new-user' }],
  });
  assert.equal(queries.length, 2);
});
