function matchSelector(el, sel) {
  if (sel[0] === '.') return el.className.includes(sel.slice(1));
  const m = sel.match(/^\[data-([a-z-]+)(?:="([^"]+)")?\]$/);
  if (m) {
    const k = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return m[2] ? el.dataset[k] === m[2] : el.dataset[k] !== undefined;
  }
  const btn = sel.match(/^button\[data-action(?:="([^"]+)")?\]$/);
  return Boolean(
    btn && el.tagName === 'BUTTON' && (!btn[1] || el.dataset.action === btn[1]),
  );
}

function queryAll(root, sel) {
  const out = [];
  const walk = (node) => {
    for (const c of node.children) {
      if (matchSelector(c, sel)) out.push(c);
      walk(c);
    }
  };
  walk(root);
  return out;
}

function matchClosest(node, sel) {
  let curr = node;
  while (curr) {
    if (matchSelector(curr, sel)) return curr;
    curr = curr.getParent?.() || null;
  }
  return null;
}

function bubble(node, type, ev) {
  let curr = node;
  while (curr) {
    curr.emit?.(type, ev);
    curr = curr.getParent?.();
  }
}

function createTreeOps(el, children) {
  let parent = null;
  return {
    getParent: () => parent,
    setParent: (p) => {
      parent = p;
    },
    appendChild: (c) => {
      c.setParent?.(el);
      children.push(c);
      return c;
    },
    append: (...items) => items.forEach((c) => el.appendChild(c)),
    replaceChildren: (...items) => {
      children.splice(0, children.length);
      el.append(...items);
    },
  };
}

export function createMockElement(tag, doc) {
  const attrs = {};
  const children = [];
  const listeners = {};
  const el = {
    tagName: tag.toUpperCase(),
    ownerDocument: doc,
    className: '',
    textContent: '',
    hidden: false,
    value: '',
    dataset: {},
    children,
    setAttribute: (k, v) => (attrs[k] = String(v)),
    getAttribute: (k) => attrs[k],
    hasAttribute: (k) => Object.prototype.hasOwnProperty.call(attrs, k),
    removeAttribute: (k) => delete attrs[k],
    addEventListener: (t, fn) => (listeners[t] ??= []).push(fn),
    emit: (t, ev) => (listeners[t] ?? []).forEach((fn) => fn(ev)),
    click: () => bubble(el, 'click', { target: el }),
    submit: () =>
      bubble(el, 'submit', { target: el, preventDefault: () => {} }),
    closest: (sel) => matchClosest(el, sel),
    querySelector: (sel) => queryAll(el, sel)[0] || null,
    querySelectorAll: (sel) => queryAll(el, sel),
  };
  return Object.assign(el, createTreeOps(el, children));
}

export function createMockDoc() {
  const doc = {};
  doc.createElement = (tag) => createMockElement(tag, doc);
  return doc;
}
