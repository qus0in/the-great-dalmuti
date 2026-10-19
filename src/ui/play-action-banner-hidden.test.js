import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderSubstitution } from './public/js/play-dom-notice.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

it('banner.css에 .play-action-banner[hidden] display none 규칙이 선언되어 있다', () => {
  const css = readFileSync(
    join(ROOT, 'src', 'ui', 'public', 'css', 'play', 'banner.css'),
    'utf8',
  );
  assert.match(
    css,
    /\.play-action-banner\[hidden\]\s*\{[^}]*display:\s*none\s*;?[^}]*\}/,
  );
});

it('play.html의 substitution 배너는 기본으로 hidden 속성을 가진다', () => {
  const html = readFileSync(
    join(ROOT, 'src', 'ui', 'public', 'play.html'),
    'utf8',
  );
  assert.match(
    html,
    /<p\s+class="play-action-banner"[^>]*data-play="substitution"[^>]*hidden[^>]*>/,
  );
});

it('대행 안내가 있으면 hidden이 해제되고 사라지면 다시 hidden으로 숨겨진다', () => {
  const element = { textContent: '', hidden: true };
  const doc = {
    querySelector: (s) => (s === '[data-play="substitution"]' ? element : null),
  };

  // 1. 대행 안내 없을 때: 초기 숨김
  renderSubstitution(doc, {});
  assert.equal(element.hidden, true);
  assert.equal(element.textContent, '');

  // 2. 대행 안내 발생 시: 문구 노출 및 hidden 해제
  renderSubstitution(doc, {
    mySeat: 0,
    lastSubstitution: { seat: 0, action: 'pass' },
  });
  assert.equal(element.hidden, false);
  assert.equal(element.textContent, '시간이 지나 대신 패스했어요');

  // 3. 안내 소멸 시: 문구 비움 및 hidden 복원
  renderSubstitution(doc, {
    mySeat: 0,
    lastSubstitution: null,
  });
  assert.equal(element.hidden, true);
  assert.equal(element.textContent, '');
});
