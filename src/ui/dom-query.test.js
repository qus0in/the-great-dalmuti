import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = join(ROOT, 'src', 'ui', 'public', 'js');
const FORBIDDEN =
  /\bgetElementById\b|\bgetElementsByClassName\b|\bgetElementsByTagName\b|\bgetElementsByName\b|\bdocument\.all\b/;

// src/ui/public/js 아래 모든 브라우저 모듈 경로
function jsFiles() {
  return readdirSync(DIR, { recursive: true })
    .filter((path) => path.endsWith('.js'))
    .map((path) => join(DIR, path));
}

it('브라우저 모듈은 querySelector 계열 DOM API만 쓴다', () => {
  const files = jsFiles();
  assert.ok(files.length > 0, '검사할 브라우저 모듈이 없다');
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!FORBIDDEN.test(text), `금지 DOM API 사용: ${file}`);
  }
});
