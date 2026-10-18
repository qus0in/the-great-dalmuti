// profile-card 테스트 설비 — avatar.js(p7 소유)를 계약 2 상태로 대체(mock)한 모듈과 가짜 DOM·sb
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, 'src', 'ui', 'public', 'js', 'profile-card.js');
// avatar.js가 아직 없어도: 계약 2 함수만 내러 profile-card.js의 import를 대체한다.
const IMPORT_LINE = /^import \{[^}]+\} from '\.\/avatar\.js';$/m;
const STUB = [
  'export const avatarPath = (userId) => `${userId}/avatar`;',
  'export const avatarUrl = (_sb, userId, version) =>',
  "  `https://avatars.test/${userId}/avatar${version ? `?v=${version}` : ''}`;",
  'export const renderCalls = [];',
  'export function renderAvatar(doc, view = {}) {',
  '  renderCalls.push({ doc, view });',
  "  return { className: `avatar avatar--${view.size ?? 'sm'}` };",
  '}',
].join('\n');

const SOURCE = readFileSync(FILE, 'utf8');
if (!IMPORT_LINE.test(SOURCE)) throw new Error('avatar.js import line missing');
const TMP = mkdtempSync(join(tmpdir(), 'dalmuti-profile-card-'));
const LOCAL = join(TMP, 'profile-card.js');
writeFileSync(LOCAL, SOURCE.replace(IMPORT_LINE, STUB));
process.on('exit', () => rmSync(TMP, { recursive: true, force: true }));
export const MOD = await import(`file://${LOCAL}`);

// 셀렉터 → 가짜 노드인 카드 root (play-dom 계열 테스트와 같은 수형 DOM)
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
  root.querySelector = (selector) =>
    ({
      '[data-profile="avatar"]': root.els.box,
      '[data-profile="change"]': root.els.change,
      '[data-profile="input"]': root.els.input,
      '[data-profile="notice"]': root.els.notice,
    })[selector] ?? null;
  return root;
}

function fakeSb(rpcData, uploadResult) {
  const uploads = [];
  const rpc =
    typeof rpcData === 'function'
      ? rpcData
      : () => Promise.resolve({ data: rpcData });
  const sb = {
    storage: {
      from: (bucket) => ({
        upload: (path, file, options) => {
          uploads.push({ bucket, path, file, options });
          // Error면 reject — 네트워크 오류 등 reject 경로를 흉내 낸다
          // Promise면 그대로 반환 — Promise.reject(null) 같은 임의 이유 reject도 흉내 낸다
          return uploadResult instanceof Error
            ? Promise.reject(uploadResult)
            : uploadResult instanceof Promise
              ? uploadResult
              : Promise.resolve(uploadResult);
        },
      }),
    },
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
