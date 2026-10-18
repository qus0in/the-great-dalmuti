import { it } from 'node:test';
import assert from 'node:assert/strict';
import {
  avatarPath,
  avatarUrl,
  fetchHiddenIds,
  renderAvatar,
  SILHOUETTE_SRC,
  BOT_SRC,
} from './public/js/avatar.js';

function createMockDoc() {
  return {
    createElement: (tag) => {
      const listeners = {};
      return {
        tagName: tag.toUpperCase(),
        className: '',
        alt: '',
        src: '',
        children: [],
        setAttribute() {},
        appendChild(child) {
          this.children.push(child);
        },
        addEventListener(evt, fn) {
          (listeners[evt] = listeners[evt] || []).push(fn);
        },
        dispatchEvent(evt) {
          for (const fn of listeners[evt.type] || []) fn(evt);
        },
      };
    },
  };
}

it('avatarPath & avatarUrl compute public URLs correctly', () => {
  assert.equal(avatarPath('u-123'), 'u-123/avatar');
  const fakeSb = {
    storage: {
      from: (bucket) => ({
        getPublicUrl: (p) => ({
          data: { publicUrl: `https://test.co/${bucket}/${p}` },
        }),
      }),
    },
  };
  assert.equal(avatarUrl(fakeSb, 'u-1'), 'https://test.co/avatars/u-1/avatar');
  assert.equal(
    avatarUrl(fakeSb, 'u-1', 'v2'),
    'https://test.co/avatars/u-1/avatar?v=v2',
  );
  assert.equal(avatarUrl(null, 'u-1'), '');
});

it('fetchHiddenIds returns Set of hidden user_ids or empty Set on error', async () => {
  const fakeSb = {
    from: () => ({
      select: () => ({
        in: () => Promise.resolve({ data: [{ user_id: 'u-1' }] }),
      }),
    }),
  };
  const ok = await fetchHiddenIds(fakeSb, ['u-1', 'u-2']);
  assert.equal(ok.has('u-1'), true);
  assert.equal(ok.has('u-2'), false);
  const errSb = {
    from: () => ({
      select: () => ({ in: () => Promise.resolve({ error: new Error('e') }) }),
    }),
  };
  const errRes = await fetchHiddenIds(errSb, ['u-1']);
  assert.equal(errRes.size, 0);
});

it('renderAvatar handles photo, hidden, bot, and error fallback', () => {
  const doc = createMockDoc();
  const s1 = renderAvatar(doc, { name: '민우', url: 'https://pic.test/u.png' });
  assert.equal(s1.children[0].src, 'https://pic.test/u.png');
  assert.equal(s1.children[0].alt, '민우 프로필');
  const s2 = renderAvatar(doc, {
    name: '지은',
    hidden: true,
    url: 'https://pic.test/u.png',
  });
  assert.equal(s2.children[0].src, SILHOUETTE_SRC);
  const s3 = renderAvatar(doc, { name: '봇 1', isBot: true });
  assert.equal(s3.children[0].src, BOT_SRC);
  const s4 = renderAvatar(doc, {
    name: '유저',
    url: 'https://pic.test/fail.png',
  });
  assert.equal(s4.children[0].src, 'https://pic.test/fail.png');
  s4.children[0].dispatchEvent({ type: 'error' });
  assert.equal(s4.children[0].src, SILHOUETTE_SRC);
});
