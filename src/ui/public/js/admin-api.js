export function createAdminApi(http) {
  const unwrap = (p) => p.then((r) => (r && r.data !== undefined ? r.data : r));
  return {
    getQueue: () => unwrap(http.get('/api/admin/queue')),
    getUsers: (q = '') =>
      unwrap(http.get(`/api/admin/users?q=${encodeURIComponent(q)}`)),
    getHistory: () => unwrap(http.get('/api/admin/history')),
    liftUser: (id, appealResult) =>
      unwrap(
        http.post(
          `/api/admin/users/${id}/lift`,
          appealResult ? { appealResult } : {},
        ),
      ),
    confirmUser: (id) => unwrap(http.post(`/api/admin/users/${id}/confirm`)),
    violateUser: (id) => unwrap(http.post(`/api/admin/users/${id}/violation`)),
    upheldAppeal: (id) => unwrap(http.post(`/api/admin/appeals/${id}/upheld`)),
  };
}

export function dispatchAction(api, { action, userId, appealId }) {
  if (action === 'suspect-lift') return api.liftUser(userId);
  if (action === 'suspect-confirm') return api.confirmUser(userId);
  if (action === 'appeal-lift') return api.liftUser(userId, 'lifted');
  if (action === 'appeal-upheld') return api.upheldAppeal(appealId);
  if (action === 'user-violate') return api.violateUser(userId);
  return null;
}
