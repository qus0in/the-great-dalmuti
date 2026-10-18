import { createMockDoc } from './admin-fixture.js';

const qData = {
  suspects: [
    { userId: 'u1', name: '민우', reportCount: 3, reasons: { photo: 2 } },
  ],
  appeals: [
    { id: 'a1', userId: 'u2', name: '철수', body: '사유', kind: 'suspect' },
  ],
};
const uData = [
  {
    userId: 'u1',
    name: '민우',
    createdAt: '2026-01-01',
    reportCount: 0,
    status: 'none',
  },
];
const hData = [
  { userId: 'u1', name: '민우', action: 'violation', by: 'adm', at: '2026' },
];

export function createFakeApi(overrides = {}) {
  const calls = [];
  const log =
    (method, res = { ok: true }) =>
    (a, b) => {
      calls.push({ method, id: a, appealResult: b, q: a });
      return Promise.resolve(res);
    };
  return {
    calls,
    getQueue: log('getQueue', qData),
    getUsers: log('getUsers', uData),
    getHistory: log('getHistory', hData),
    liftUser: log('liftUser'),
    confirmUser: log('confirmUser'),
    violateUser: log('violateUser'),
    upheldAppeal: log('upheldAppeal'),
    ...overrides,
  };
}

function makePanels(doc) {
  const q = doc.createElement('section');
  q.dataset.panel = 'queue';
  const u = doc.createElement('section');
  u.dataset.panel = 'users';
  u.hidden = true;
  const h = doc.createElement('section');
  h.dataset.panel = 'history';
  h.hidden = true;
  const mk = (k) => {
    const el = doc.createElement('div');
    el.dataset.admin = k;
    return el;
  };
  q.append(mk('suspects-list'), mk('appeals-list'));
  u.appendChild(mk('users-list'));
  h.appendChild(mk('history-list'));
  return { q, u, h };
}

export function setupAdminTree() {
  const doc = createMockDoc();
  const root = doc.createElement('div');
  root.dataset.admin = 'root';
  const forbidden = doc.createElement('div');
  forbidden.dataset.admin = 'forbidden';
  forbidden.hidden = true;
  const fbMsg = doc.createElement('p');
  fbMsg.dataset.admin = 'forbidden-message';
  forbidden.appendChild(fbMsg);
  const app = doc.createElement('div');
  app.dataset.admin = 'app';
  const mkTab = (t) => {
    const el = doc.createElement('button');
    el.dataset.tab = t;
    return el;
  };
  const [tQ, tU, tH] = ['queue', 'users', 'history'].map(mkTab);
  const { q, u, h } = makePanels(doc);
  const form = doc.createElement('form');
  form.dataset.admin = 'search-form';
  const input = doc.createElement('input');
  input.dataset.admin = 'search-input';
  form.appendChild(input);
  u.appendChild(form);
  app.append(tQ, tU, tH, q, u, h);
  root.append(forbidden, app);
  return { doc, root, tQ, tU, tH, q, u, h, form, input, forbidden, fbMsg, app };
}
