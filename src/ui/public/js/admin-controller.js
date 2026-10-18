import * as defaultViews from './admin-view.js';
import { dispatchAction } from './admin-api.js';

export const isForbidden = (err) =>
  err?.status === 403 ||
  err?.code === 'FORBIDDEN' ||
  err?.error === 'FORBIDDEN';

function switchTabUI(root, activeTab) {
  for (const tab of root.querySelectorAll('[data-tab]')) {
    tab.setAttribute('aria-selected', String(tab.dataset.tab === activeTab));
  }
  for (const panel of root.querySelectorAll('[data-panel]')) {
    panel.hidden = panel.dataset.panel !== activeTab;
  }
}

async function renderCurrentTab(root, { tab, query, api, views }) {
  const el = (k) => root.querySelector(`[data-admin="${k}"]`);
  if (tab === 'queue') {
    const data = await api.getQueue();
    views.renderSuspects(el('suspects-list'), data.suspects);
    views.renderAppeals(el('appeals-list'), data.appeals);
  } else if (tab === 'users') {
    views.renderUsers(el('users-list'), await api.getUsers(query));
  } else if (tab === 'history') {
    views.renderHistory(el('history-list'), await api.getHistory());
  }
}

function bindEvents(root, { onTab, onAction, onSearch }) {
  root.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) return onTab(tabBtn.dataset.tab);
    const btn = e.target.closest('button[data-action]');
    if (btn && !btn.hasAttribute('disabled')) onAction(btn);
  });
  root
    .querySelector('[data-admin="search-form"]')
    ?.addEventListener('submit', (e) => {
      e.preventDefault();
      onSearch(root.querySelector('[data-admin="search-input"]')?.value || '');
    });
}

function createActionRunner({ api, reload, onForbidden }) {
  let busy = false;
  return async (btn) => {
    if (busy) return;
    const { action } = btn.dataset;
    const userId = btn.closest('[data-user-id]')?.dataset.userId;
    const appealId = btn.closest('[data-appeal-id]')?.dataset.appealId;
    busy = true;
    btn.setAttribute('disabled', '');
    try {
      await dispatchAction(api, { action, userId, appealId });
      await reload();
    } catch (err) {
      if (isForbidden(err) && onForbidden) onForbidden();
    } finally {
      busy = false;
      btn.removeAttribute('disabled');
    }
  };
}

export function createAdminController({
  root,
  api,
  view = defaultViews,
  onForbidden,
}) {
  let tab = 'queue';
  let query = '';
  switchTabUI(root, tab);
  const reload = async () => {
    switchTabUI(root, tab);
    try {
      await renderCurrentTab(root, { tab, query, api, views: view });
    } catch (err) {
      if (isForbidden(err) && onForbidden) onForbidden();
    }
  };
  const onAction = createActionRunner({ api, reload, onForbidden });
  const onTab = (next) => {
    tab = next;
    reload();
  };
  const onSearch = (q) => {
    query = q;
    reload();
  };
  bindEvents(root, { onTab, onAction, onSearch });
  reload();
  return { reload, getTab: () => tab };
}
