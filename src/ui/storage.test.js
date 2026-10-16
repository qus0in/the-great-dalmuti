import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as storage from './public/js/storage.js';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOC = join(ROOT, 'docs', 'storage.md');
const PREFIX = 'dalmuti:';
const DIRECT =
  /(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*['"`]([^'"`]+)['"`]/g;
// 테스트 전용 임시 등록표 (제품 키 아님, 실제 등록표는 비어 있다)
const FIXTURE_KEYS = {
  'demo:flag': { storage: 'local', kind: 'boolean' },
  'demo:name': { storage: 'session', kind: 'string' },
};
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}
function withWindow(fn) {
  const previous = globalThis.window;
  globalThis.window = {
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
  };
  try {
    return fn();
  } finally {
    globalThis.window = previous;
  }
}
// 저장소 모듈 밖 직접 접근: 키를 검사하고 남은 흔적이 있으면 실패시킨다
function scanSources(keys) {
  const files = readdirSync(join(ROOT, 'src'), { recursive: true }).filter(
    (p) =>
      p.endsWith('.js') && !p.endsWith('storage.js') && !p.includes('.test.'),
  );
  for (const rel of files) {
    const file = join(ROOT, 'src', rel);
    let text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(DIRECT)) {
      const key = m[1];
      assert.ok(
        key.startsWith(PREFIX) && keys.includes(key.slice(PREFIX.length)),
        `미등록 키 저장: ${key} (${rel})`,
      );
    }
    text = text
      .replace(DIRECT, '')
      .replace(/storage:\s*window\.sessionStorage/, '');
    assert.ok(
      !/(?:localStorage|sessionStorage)/.test(text),
      `직접 접근: ${rel}`,
    );
  }
}
it('Given injected registry, When set/get/remove, Then stored under dalmuti names', () => {
  withWindow(() => {
    const demo = storage.createStorage(FIXTURE_KEYS);
    demo.setItem('demo:flag', true);
    demo.setItem('demo:name', 'ROOM01');
    const win = globalThis.window;
    assert.equal(win.localStorage.getItem('dalmuti:demo:flag'), '1');
    assert.equal(win.sessionStorage.getItem('dalmuti:demo:name'), 'ROOM01');
    assert.equal(demo.getItem('demo:flag'), true);
    assert.equal(demo.keyName('demo:name'), 'dalmuti:demo:name');
    demo.removeItem('demo:name');
    assert.equal(demo.getItem('demo:name'), null);
  });
});
it('Given empty default registry, When unregistered or forbidden key, Then rejected', () => {
  withWindow(() => {
    assert.throws(() => storage.setItem('room:nope', 1), /허용되지 않은 키/);
    assert.throws(() => storage.setItem('room:token', 'x'), /금지된 키/);
    assert.throws(() => storage.getItem('room:missing'), /허용되지 않은 키/);
    assert.throws(() => storage.removeItem('room:nope'), /허용되지 않은 키/);
    const demo = storage.createStorage(FIXTURE_KEYS);
    assert.throws(() => demo.setItem('demo:flag', '1'), /타입 불일치/);
    assert.throws(() => demo.setItem('demo:extra', 1), /허용되지 않은 키/);
  });
});
it('Given doc, registry, and sources, Then keys match and access is gated', () => {
  const text = readFileSync(DOC, 'utf8');
  const found = new Set();
  for (const m of text.matchAll(/`dalmuti:([a-z-]+:[a-z-]+)`/g))
    found.add(m[1]);
  const keys = Object.keys(storage.STORAGE_KEYS);
  assert.deepEqual(keys.slice().sort(), [...found].sort());
  scanSources(keys);
  const prose = text.replace(/`[^`]*`/g, '').replace(/\]\([^)]*\)/g, '');
  const tokens = [...new Set(prose.match(/[A-Za-z][A-Za-z0-9_-]{2,}/g) ?? [])];
  const extra = tokens.filter((t) => !/^(Why|What|How)$/.test(t));
  assert.deepEqual(extra, []);
});
