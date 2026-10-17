import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createRoom } from '../../app/game/room-create.js';
import { startGame } from '../../app/game/room-start.js';
import { createSupabaseGameRepository } from './supabase-game-repository.js';
import { createMockClient } from './mock-client.test-helper.js';

async function createTutorial() {
  const store = [];
  const client = createMockClient({ store });
  const created = await createRoom(
    { gameRepository: createSupabaseGameRepository({ client }) },
    { hostUser: { id: 'host' }, mode: 'tutorial' },
  );
  return { store, created };
}

it('Given tutorial room, When inserted, fetched and started, Then private and public mode survive', async () => {
  const { store, created } = await createTutorial();
  const tables = Object.fromEntries(
    store.map(({ table, data }) => [
      table,
      Array.isArray(data) ? data : [data],
    ]),
  );
  assert.equal(tables.games[0].mode, 'tutorial');
  assert.equal(tables.game_public[0].mode, 'tutorial');
  const gameRepository = createSupabaseGameRepository({
    client: createMockClient({ tables, store }),
  });
  const fetched = await gameRepository.findGameById(created.game.id);
  assert.equal(fetched.game.mode, 'tutorial');
  assert.equal(fetched.publicState.mode, 'tutorial');
  const started = await startGame(
    { gameRepository, rng: { random: () => 0.5 } },
    { joinCode: created.game.joinCode, user: { id: 'host' } },
  );
  assert.equal(started.game.mode, 'tutorial');
  assert.equal(started.publicState.mode, 'tutorial');
  const updates = store.filter((s) => s.table === 'game_public');
  assert.equal(updates.at(-1).op, 'upsert');
  assert.equal(updates.at(-1).data.mode, 'tutorial');
});
