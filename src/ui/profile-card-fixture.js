// profile-card 테스트 설비 — avatar.js(p7 소유)를 계약 2 상태로 대체(mock)한 모듈과 가짜 DOM·sb
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, 'src', 'ui', 'public', 'js', 'profile-card.js');
const IMPORT_LINE = /^import \{[^}]+\} from '\.\/avatar\.js';$/m;
const STUB = `export const avatarPath = (u) => \`\${u}/avatar\`;
export const avatarUrl = (_s, u, v) => \`https://avatars.test/\${u}/avatar\${v ? \`?v=\${v}\` : ''}\`;
export const renderCalls = [];
export const renderAvatar = (doc, view = {}) => {
  renderCalls.push({ doc, view });
  return { className: \`avatar avatar--\${view.size ?? 'sm'}\` };
};`;

const SOURCE = readFileSync(FILE, 'utf8');
if (!IMPORT_LINE.test(SOURCE)) throw new Error('avatar.js import line missing');
const TMP = mkdtempSync(join(tmpdir(), 'dalmuti-profile-card-'));
const LOCAL = join(TMP, 'profile-card.js');
const JS_DIR = join(ROOT, 'src', 'ui', 'public', 'js');
for (const f of ['profile-appeal.js', 'moderation-api.js', 'features.js']) {
  const p = join(JS_DIR, f);
  if (existsSync(p)) writeFileSync(join(TMP, f), readFileSync(p));
}
writeFileSync(LOCAL, SOURCE.replace(IMPORT_LINE, STUB));
process.on('exit', () => rmSync(TMP, { recursive: true, force: true }));
export const MOD = await import(`file://${LOCAL}`);

const el = () => ({
  className: '',
  hidden: false,
  textContent: '',
  disabled: false,
  replaceChildren: () => {},
});

function fakeRoot() {
  const root = el();
  root.ownerDocument = {};
  root.avatars = [];
  root.els = { box: el(), change: el(), input: el(), notice: el() };
  root.els.box.replaceChildren = (child) => root.avatars.push(child);
  const map = {
    '[data-profile="avatar"]': root.els.box,
    '[data-profile="change"]': root.els.change,
    '[data-profile="input"]': root.els.input,
    '[data-profile="notice"]': root.els.notice,
  };
  root.querySelector = (selector) => map[selector] ?? null;
  return root;
}

function makeStorage(uploads, res) {
  return {
    from: (bucket) => ({
      upload: (path, file, options) => {
        uploads.push({ bucket, path, file, options });
        if (res instanceof Error) return Promise.reject(res);
        return res instanceof Promise ? res : Promise.resolve(res);
      },
    }),
  };
}

function fakeSb(rpcData, res) {
  const uploads = [];
  const rpc =
    typeof rpcData === 'function'
      ? rpcData
      : () => Promise.resolve({ data: rpcData });
  const sb = {
    storage: makeStorage(uploads, res),
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({ limit: () => Promise.resolve({ data: [] }) }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
    rpc,
  };
  return { sb, uploads };
}

export function cardOn(rpcData, uploadResult = { error: null }) {
  const root = fakeRoot();
  const { sb, uploads } = fakeSb(rpcData, uploadResult);
  const card = MOD.createProfileCard({ root, sb, userId: 'u-1', name: '로아' });
  return { card, root, uploads };
}
