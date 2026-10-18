import { renderAvatar } from './avatar.js';

export { renderSuspects, renderAppeals } from './admin-view-queue.js';

export const STATUS_LABELS = {
  none: '정상',
  suspect: '의심',
  violation: '위반',
};
export const ACTION_LABELS = {
  violation: '위반 차단',
  confirm: '위반 확정',
  lift: '풀기',
  upheld: '이의 유지',
};

export function renderEmpty(container, message) {
  const p = container.ownerDocument.createElement('p');
  p.className = 'admin-empty';
  p.textContent = message;
  container.replaceChildren(p);
}

function makeRow(doc, name) {
  const li = doc.createElement('li');
  li.className = 'admin-item';
  const left = doc.createElement('div');
  left.className = 'admin-item__content';
  left.appendChild(renderAvatar(doc, { name, size: 'sm' }));
  const info = doc.createElement('div');
  info.className = 'admin-item__info';
  const nm = doc.createElement('span');
  nm.className = 'admin-item__name';
  nm.textContent = name;
  info.appendChild(nm);
  left.appendChild(info);
  li.appendChild(left);
  return { li, info };
}

function renderList(container, { list = [], emptyMsg, buildLi }) {
  if (!list.length) return renderEmpty(container, emptyMsg);
  const doc = container.ownerDocument;
  const ul = doc.createElement('ul');
  ul.className = 'admin-list';
  for (const item of list) ul.appendChild(buildLi(doc, item));
  container.replaceChildren(ul);
}

export function renderUsers(container, list = []) {
  renderList(container, {
    list,
    emptyMsg: '검색 결과가 없어요.',
    buildLi: (doc, u) => {
      const { li, info } = makeRow(doc, u.name);
      li.dataset.userId = u.userId;
      const st = STATUS_LABELS[u.status] || u.status;
      const dt = u.createdAt ? u.createdAt.slice(0, 10) : '-';
      const meta = doc.createElement('span');
      meta.className = 'admin-item__meta';
      meta.textContent = `가입 ${dt} · 신고 ${u.reportCount}회 · 상태: ${st}`;
      info.appendChild(meta);
      if (u.status === 'none') {
        const acts = doc.createElement('div');
        acts.className = 'admin-item__actions';
        const btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn--primary';
        btn.dataset.action = 'user-violate';
        btn.textContent = '위반 차단';
        acts.appendChild(btn);
        li.appendChild(acts);
      }
      return li;
    },
  });
}

export function renderHistory(container, list = []) {
  renderList(container, {
    list,
    emptyMsg: '처리 기록이 없어요.',
    buildLi: (doc, h) => {
      const { li, info } = makeRow(doc, h.name);
      const act = ACTION_LABELS[h.action] || h.action;
      const dt = h.at ? h.at.slice(0, 19).replace('T', ' ') : '-';
      const meta = doc.createElement('span');
      meta.className = 'admin-item__meta';
      meta.textContent = `${act} · 처리자: ${h.by} · ${dt}`;
      info.appendChild(meta);
      return li;
    },
  });
}
