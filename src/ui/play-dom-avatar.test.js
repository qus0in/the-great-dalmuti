import { it } from 'node:test';
import assert from 'node:assert/strict';
import { renderPlay } from './public/js/play-dom.js';
import { SILHOUETTE_SRC } from './public/js/avatar.js';

function node(sub = {}) {
  const children = [];
  return {
    className: '',
    children,
    setAttribute() {},
    appendChild: (child) => children.push(child),
    replaceChildren: (...items) =>
      children.splice(0, children.length, ...items),
    querySelector: (selector) =>
      sub[selector] ??
      children.find((child) => child.className?.includes('avatar')) ??
      null,
  };
}

function createDoc() {
  const nodes = {};
  for (let seat = 0; seat < 4; seat += 1) {
    nodes[seat] = node({ '.seat__avatar': node() });
  }
  return {
    nodes,
    createElement: () => node(),
    querySelector: (selector) => {
      const match = selector.match(/data-seat="(\d+)"/);
      return match ? nodes[Number(match[1])] : null;
    },
  };
}

it('renders public avatar URLs and hides photos for profiles marked hidden', () => {
  const doc = createDoc();
  const sb = {
    storage: {
      from: (bucket) => ({
        getPublicUrl: (path) => ({
          data: { publicUrl: `https://storage.test/${bucket}/${path}` },
        }),
      }),
    },
  };
  renderPlay(doc, {
    sb,
    hiddenIds: new Set(['hidden-user']),
    publicState: {
      seatSummary: [
        { seat: 0, userId: 'visible-user', userName: '참가자' },
        { seat: 1, userId: 'hidden-user', userName: '가린 참가자' },
      ],
    },
  });
  const image = (slot) =>
    doc.nodes[slot].querySelector('.seat__avatar').querySelector('.avatar')
      .children[0];
  assert.equal(
    image(2).src,
    'https://storage.test/avatars/visible-user/avatar',
  );
  assert.equal(image(3).src, SILHOUETTE_SRC);
});
