// 클라이언트 저장소 접근은 이 모듈만 통한다 (정책: docs/storage.md)
const PREFIX = 'dalmuti:';

// 실제 필요해질 때만 항목을 추가한다 (문서 표·이 등록표·테스트를 함께).
export const STORAGE_KEYS = {};

// 등록 여부와 무관하게 금지 낱말이 들어간 키는 거부한다 (방어선)
const FORBIDDEN = /token|secret|password|passwd|jwt|cookie|hand|result/i;

function entryOf(keys, name) {
  if (FORBIDDEN.test(name)) throw new Error(`금지된 키: ${name}`);
  const entry = keys[name];
  if (!entry) throw new Error(`허용되지 않은 키: ${name}`);
  return entry;
}

function storeOf(entry) {
  return entry.storage === 'local'
    ? window.localStorage
    : window.sessionStorage;
}

function encode(name, entry, value) {
  if (entry.kind === 'boolean') {
    if (typeof value !== 'boolean') throw new Error(`타입 불일치: ${name}`);
    return value ? '1' : '0';
  }
  if (typeof value !== 'string') throw new Error(`타입 불일치: ${name}`);
  return value;
}

function decode(entry, raw) {
  if (raw === null) return null;
  return entry.kind === 'boolean' ? raw === '1' : raw;
}

// 등록표를 주입해 저장소 접근자를 만든다 (테스트는 임시 표를 쓴다)
export function createStorage(keys = STORAGE_KEYS) {
  return {
    keys,
    keyName: (name) => {
      entryOf(keys, name);
      return `${PREFIX}${name}`;
    },
    getItem: (name) => {
      const entry = entryOf(keys, name);
      return decode(entry, storeOf(entry).getItem(`${PREFIX}${name}`));
    },
    setItem: (name, value) => {
      const entry = entryOf(keys, name);
      storeOf(entry).setItem(`${PREFIX}${name}`, encode(name, entry, value));
    },
    removeItem: (name) => {
      const entry = entryOf(keys, name);
      storeOf(entry).removeItem(`${PREFIX}${name}`);
    },
  };
}

const { getItem, setItem, removeItem, keyName } = createStorage();
export { getItem, setItem, removeItem, keyName };
