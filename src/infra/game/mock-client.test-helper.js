// 테스트용 Supabase Mock Query Client

function resolveResult(error, data) {
  return Promise.resolve(error ? { error } : { data, error: null });
}

function filterRows(rows, col, val) {
  return col ? rows.filter((r) => r[col] === val) : rows;
}

function buildChain({ table, tables, error, updateReturn }) {
  let col = null;
  let val = null;
  let isUpdate = false;
  const list = tables[table] ?? [];
  const chain = {
    select: () => chain,
    order: () => chain,
    eq: (c, v) => {
      col = c;
      val = v;
      return chain;
    },
    insert: (data) => resolveResult(error, data),
    upsert: (data) => resolveResult(error, data),
    update: () => {
      isUpdate = true;
      return chain;
    },
    maybeSingle: () =>
      resolveResult(error, list.find((r) => r[col] === val) ?? null),
    then: (res) =>
      resolveResult(
        error,
        isUpdate ? updateReturn : filterRows(list, col, val),
      ).then(res),
  };
  return chain;
}

export function createMockClient(opts = {}) {
  const { tables = {}, updateReturn = [{ id: 'g1' }], error = null } = opts;
  return {
    from: (table) => buildChain({ table, tables, error, updateReturn }),
  };
}
