// 테스트용 Supabase Mock Query Client

function resolveResult(error, data) {
  return Promise.resolve(error ? { error } : { data, error: null });
}

function applyFilters(rows, filters) {
  return rows.filter((r) => filters.every(({ col, val }) => r[col] === val));
}

function applyOrder(rows, col, asc) {
  if (!col) return rows;
  return [...rows].sort((a, b) => {
    const va = a[col];
    const vb = b[col];
    if (va === vb) return 0;
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    return asc ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
  });
}

function buildTerminators({
  list,
  filters,
  sort,
  isUpdate,
  updateReturn,
  error,
}) {
  return {
    maybeSingle: () => {
      const filtered = applyFilters(list, filters);
      const ordered = applyOrder(filtered, sort.col, sort.asc);
      return resolveResult(error, ordered[0] ?? null);
    },
    then: (res) => {
      if (isUpdate.value) return resolveResult(error, updateReturn).then(res);
      const filtered = applyFilters(list, filters);
      const ordered = applyOrder(filtered, sort.col, sort.asc);
      return resolveResult(error, ordered).then(res);
    },
  };
}

function buildMutations(table, store, error) {
  return {
    insert: (data) => {
      if (store) store.push({ table, op: 'insert', data });
      return resolveResult(error, data);
    },
    upsert: (data, opts) => {
      if (store) store.push({ table, op: 'upsert', data, opts });
      return resolveResult(error, data);
    },
  };
}

function buildChain({ table, tables, error, updateReturn, store }) {
  const filters = [];
  const sort = { col: null, asc: true };
  const isUpdate = { value: false };
  const list = tables[table] ?? [];
  const chain = {
    select: () => chain,
    order: (col, opts = {}) => {
      sort.col = col;
      sort.asc = opts.ascending ?? true;
      return chain;
    },
    eq: (col, val) => {
      filters.push({ col, val });
      return chain;
    },
    is: (col, val) => {
      filters.push({ col, val });
      return chain;
    },
    update: () => {
      isUpdate.value = true;
      return chain;
    },
    ...buildMutations(table, store, error),
    ...buildTerminators({ list, filters, sort, isUpdate, updateReturn, error }),
  };
  return chain;
}

export function createMockClient(opts = {}) {
  const {
    tables = {},
    updateReturn = [{ id: 'g1' }],
    error = null,
    store = null,
  } = opts;
  return {
    from: (table) => buildChain({ table, tables, error, updateReturn, store }),
  };
}
