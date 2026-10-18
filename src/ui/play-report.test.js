import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createRoomReportContext } from './public/js/play-report.js';
import { renderSeats } from './public/js/play-dom-seats.js';
import { docOf, pubOf } from './report-fixture.js';

function seatReportButton(doc) {
  return Object.values(doc.slots)
    .map(({ els }) =>
      els.row.children.find((child) => child.attrs['data-report'] === 'seat'),
    )
    .find(Boolean);
}

function renderExampleSeats(doc, context, tutorial = false) {
  const other = tutorial
    ? { seat: 1, userName: '봇', cardCount: 5, userId: 'bot', isBot: true }
    : { seat: 1, userName: '상대', cardCount: 5, userId: 'u2' };
  renderSeats(
    doc,
    pubOf([{ seat: 0, userName: '나', cardCount: 5, userId: 'me' }, other]),
    { mySeat: 0, ...context },
  );
}

it('일반 방 좌석 신고 버튼이 사진 사유 메뉴를 연다', () => {
  const doc = docOf();
  const appended = [];
  doc.body.appendChild = (element) => appended.push(element);
  const context = createRoomReportContext(doc, {
    client: {},
    user: { id: 'me' },
    features: { moderationUi: true },
    room: { publicState: { mode: 'multi' } },
  });
  renderExampleSeats(doc, context);
  seatReportButton(doc).emit('click');
  assert.equal(appended[0].hidden, false);
  const reason = appended[0].children[0].children.find(
    (child) => child.className === 'report-menu__reason',
  );
  assert.equal(reason.children[0].checked, true);
});

it('튜토리얼 방에는 신고 메뉴와 좌석 버튼이 없다', () => {
  const doc = docOf();
  const context = createRoomReportContext(doc, {
    client: {},
    user: { id: 'me' },
    room: { publicState: { mode: 'tutorial' } },
  });
  renderExampleSeats(doc, context, true);
  assert.deepEqual(context, {});
  assert.equal(seatReportButton(doc), undefined);
});
