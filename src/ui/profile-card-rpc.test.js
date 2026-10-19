import { it } from 'node:test';
import assert from 'node:assert/strict';
import { MOD, cardOn } from './profile-card-fixture.js';

it('Supabase RPC thenable without catch still applies suspect state and avatar', async () => {
  const { card, root } = cardOn(null);
  card.card.sb.rpc = () => ({
    then: (resolve, reject) =>
      Promise.resolve({ data: 'suspect' }).then(resolve, reject),
  });

  await card.loadHiddenState();

  assert.equal(card.card.hiddenKind, 'suspect');
  assert.equal(root.els.notice.textContent, MOD.NOTICES.suspect);
  assert.equal(root.els.change.disabled, true);
  assert.equal(MOD.renderCalls.at(-1).view.hidden, true);
});
