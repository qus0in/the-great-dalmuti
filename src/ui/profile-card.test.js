import { it } from 'node:test';
import assert from 'node:assert/strict';
import { MOD, cardOn } from './profile-card-fixture.js';
const { checkFile, applyHiddenState, kindOf, NOTICES } = MOD;

// 결정 2 — 형식 판정: PNG·JPEG·WebP만, 1MB 경계(1048576 포함)까지 허용
it('결정 2: 형식·용량 경계 검사', () => {
  const cases = [
    [{ type: 'image/png', size: 1048576 }, ''],
    [{ type: 'image/jpeg', size: 1048576 }, ''],
    [{ type: 'image/webp', size: 1 }, ''],
    [{ type: 'image/gif', size: 10 }, NOTICES.format],
    [{ type: 'image/png', size: 1048577 }, NOTICES.size],
    [{ type: 'image/gif', size: 1048577 }, NOTICES.format],
  ];
  for (const [file, want] of cases) assert.equal(checkFile(file), want);
  assert.equal(NOTICES.format.length > 0 && NOTICES.size.length > 0, true);
});

// ADR-0016 결정 17·24 — 사용자 원문 그대로 (바이트 일치)
it('결정 17·24: 가림 문구는 원문 그대로', () => {
  assert.equal(
    NOTICES.suspect,
    '정책 위반 의심으로 프로필 사진이 가려졌어요. 검토 후 풀어드릴게요!',
  );
  assert.equal(NOTICES.violation, '정책 위반으로 프로필 사진이 삭제됐어요.');
  assert.equal(kindOf('suspect'), 'suspect');
  assert.equal(kindOf('violation'), 'violation');
  assert.equal(kindOf('other'), null);
  assert.equal(kindOf(null), null);
});

// 결정 26 — 의심·위반은 문구 표시와 함께 버튼·input 비활성, 그 외는 잠금 없음
it('결정 26: 상태별 문구·잠금 상태', () => {
  const cases = [
    ['suspect', NOTICES.suspect, true],
    ['violation', NOTICES.violation, true],
    [null, '', false],
    ['other', '', false],
  ];
  for (const [kind, text, locked] of cases) {
    const { root } = cardOn(null);
    assert.equal(applyHiddenState(root, kind), locked);
    assert.equal(root.els.notice.textContent, text);
    assert.equal(root.els.notice.hidden, !locked);
    assert.equal(root.els.change.disabled, locked);
    assert.equal(root.els.input.disabled, locked);
  }
});

// 라운드 2 회귀 — reject는 이유 값과 무관하게 실패 안내·version 불변
it('업로드 reject(null·undefined·Error): 이유와 무관한 실패 안내, version 불변', async () => {
  for (const reason of [null, undefined, new Error('x')]) {
    const { card, root, uploads } = cardOn(null, Promise.reject(reason));
    await card.select({ type: 'image/jpeg', size: 10 });
    assert.equal(uploads.length, 1);
    assert.equal(root.els.notice.textContent, MOD.NOTICES.uploadFail);
    assert.equal(root.els.notice.hidden, false);
    assert.equal(card.card.version, 0);
    assert.deepEqual(root.avatars, []); // redraw 없음
  }
});
