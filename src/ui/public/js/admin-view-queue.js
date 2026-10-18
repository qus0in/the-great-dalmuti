import { renderAvatar } from './avatar.js';

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

function makeBtn(doc, text, actionSpec) {
  const [action, mod] = actionSpec.split(':');
  const btn = doc.createElement('button');
  btn.type = 'button';
  btn.className = mod ? `btn btn--${mod}` : 'btn btn--secondary';
  btn.dataset.action = action;
  btn.textContent = text;
  return btn;
}

function buildSuspectLi(doc, s) {
  const { li, info } = makeRow(doc, s.name);
  li.dataset.userId = s.userId;
  const r = s.reasons || {};
  const meta = doc.createElement('span');
  meta.className = 'admin-item__meta';
  meta.textContent = `신고 ${s.reportCount}회 · 사진 ${r.photo || 0} 채팅 ${r.chat || 0} 기타 ${r.other || 0}`;
  info.appendChild(meta);
  const acts = doc.createElement('div');
  acts.className = 'admin-item__actions';
  acts.append(
    makeBtn(doc, '풀기', 'suspect-lift'),
    makeBtn(doc, '위반 확정', 'suspect-confirm:primary'),
  );
  li.appendChild(acts);
  return li;
}

function buildAppealLi(doc, a) {
  const { li, info } = makeRow(doc, a.name);
  li.dataset.appealId = a.id;
  li.dataset.userId = a.userId;
  const meta = doc.createElement('span');
  meta.className = 'admin-item__meta';
  meta.textContent = `종류: ${a.kind === 'suspect' ? '의심' : '위반'}`;
  info.appendChild(meta);
  const body = doc.createElement('p');
  body.className = 'admin-item__body';
  body.textContent = a.body;
  info.appendChild(body);
  const acts = doc.createElement('div');
  acts.className = 'admin-item__actions';
  acts.append(
    makeBtn(doc, '풀기', 'appeal-lift'),
    makeBtn(doc, '유지', 'appeal-upheld:outline'),
  );
  li.appendChild(acts);
  return li;
}

function renderList(container, { list = [], emptyMsg, buildLi }) {
  if (!list.length) {
    const p = container.ownerDocument.createElement('p');
    p.className = 'admin-empty';
    p.textContent = emptyMsg;
    return container.replaceChildren(p);
  }
  const doc = container.ownerDocument;
  const ul = doc.createElement('ul');
  ul.className = 'admin-list';
  for (const item of list) ul.appendChild(buildLi(doc, item));
  container.replaceChildren(ul);
}

export const renderSuspects = (c, list) =>
  renderList(c, {
    list,
    emptyMsg: '대기 중인 의심 유저가 없어요.',
    buildLi: buildSuspectLi,
  });

export const renderAppeals = (c, list) =>
  renderList(c, {
    list,
    emptyMsg: '대기 중인 이의제기가 없어요.',
    buildLi: buildAppealLi,
  });
