import { setupProfileAppeal } from './public/js/profile-appeal.js';

function makeInteractive() {
  return {
    addEventListener(e, f) {
      this._handler = f;
    },
    trigger(arg) {
      this._handler?.(arg);
    },
  };
}

function makeTextarea() {
  return {
    value: '',
    ...makeInteractive(),
    input(v) {
      this.value = v;
      this.trigger();
    },
    focus() {},
  };
}

function buildEls() {
  const btn = {
    hidden: false,
    ...makeInteractive(),
    click() {
      this.trigger();
    },
  };
  const form = {
    hidden: false,
    ...makeInteractive(),
    submit() {
      this.trigger({ preventDefault() {} });
    },
  };
  return {
    root: { hidden: false },
    btn,
    form,
    textarea: makeTextarea(),
    count: { textContent: '' },
    submit: { disabled: false },
    status: { textContent: '', hidden: false },
  };
}

function buildFakeSb(res, inserts) {
  return {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () =>
              Promise.resolve({
                data:
                  res.decision !== undefined
                    ? [{ decision: res.decision }]
                    : [],
              }),
          }),
        }),
      }),
      insert: (row) => {
        inserts.push({ table, row });
        return Promise.resolve(
          res.error ? { error: res.error } : { error: null },
        );
      },
    }),
  };
}

export function createFixture(res = {}) {
  const els = buildEls();
  const map = {
    '[data-appeal="root"]': els.root,
    '[data-appeal="open"]': els.btn,
    '[data-appeal="form"]': els.form,
    '[data-appeal="textarea"]': els.textarea,
    '[data-appeal="count"]': els.count,
    '[data-appeal="submit"]': els.submit,
    '[data-appeal="status"]': els.status,
  };
  const root = { querySelector: (sel) => map[sel] ?? null };
  const inserts = [];
  const sb = buildFakeSb(res, inserts);
  const ON = { moderationUi: true };
  const card = { root, sb, userId: 'u-1', hiddenKind: 'suspect', features: ON };
  const appeal = setupProfileAppeal(card);
  return { card, els, appeal, inserts };
}
