import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = readFileSync(
  join(ROOT, 'src', 'ui', 'public', 'css', 'play', 'hand-mobile.css'),
  'utf8',
);

it('모바일에서 선택 힌트는 숨기고 튜토리얼 힌트는 보이게 한다', () => {
  assert.match(css, /\[data-play="selection-hint"\]\s*\{[^}]*display:\s*none/);
  assert.match(css, /\[data-play="hint"\][^{]*\{[^}]*display:\s*-webkit-box/);
});

it('튜토리얼 힌트는 두 줄로 제한하고 말줄임한다', () => {
  assert.match(css, /-webkit-line-clamp:\s*2/);
  assert.match(css, /overflow:\s*hidden/);
});

it('선택 힌트 공용 클래스 통째 숨김은 없다', () => {
  assert.doesNotMatch(
    css,
    /\.play-hand-header__selection-hint\s*\{[^}]*display:\s*none/,
  );
});
