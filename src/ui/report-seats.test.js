// 계약 1·2 — 좌석 진입점: 사람·타인 좌석에만 '신고' 버튼.
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { renderSeats } from './public/js/play-dom-seats.js';
import { docOf, pubOf } from './report-fixture.js';
function reported(row) {
  return row.children.find((c) => c.attrs['data-report'] === 'seat') || null;
}
it('사람·타인 좌석: 버튼·클릭 전달(reason photo)', () => {
  const seen = [];
  const doc = docOf();
  const summary = [
    { seat: 0, userName: '나', cardCount: 5, userId: 'me' },
    { seat: 1, userName: '봇', cardCount: 5, userId: 'b1', isBot: true },
    { seat: 2, userName: '민우', cardCount: 5, userId: 'u2' },
    { seat: 3, userName: '지은', cardCount: 5, userId: 'u3' },
  ];
  renderSeats(doc, pubOf(summary), {
    mySeat: 0,
    me: 'me',
    features: { moderationUi: true },
    onReport: (target) => seen.push(target),
  });
  const btn = reported(doc.slots[0].els.row);
  assert.equal(btn.className, 'seat__report');
  btn.emit('click');
  assert.deepEqual(seen, [{ targetId: 'u2', reason: 'photo' }]);
  assert.equal(reported(doc.slots[2].els.row), null);
  assert.equal(reported(doc.slots[3].els.row), null);
  assert.equal(reported(doc.slots[1].els.row).className, 'seat__report');
});
it('빈자리 렌더: 오래된 버튼 제거', () => {
  const doc = docOf();
  const opts = {
    mySeat: 0,
    me: 'me',
    features: { moderationUi: true },
    onReport: () => {},
  };
  const base = [
    { seat: 0, userName: '나', cardCount: 5, userId: 'me' },
    { seat: 2, userName: '민우', cardCount: 5, userId: 'u2' },
  ];
  renderSeats(doc, pubOf(base), opts);
  assert.equal(reported(doc.slots[0].els.row).className, 'seat__report');
  const solo = [{ seat: 0, userName: '나', cardCount: 4, userId: 'me' }];
  renderSeats(doc, pubOf(solo), opts);
  assert.equal(reported(doc.slots[0].els.row), null);
});
