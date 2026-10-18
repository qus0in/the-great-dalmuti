import { it } from 'node:test';
import assert from 'node:assert/strict';
import { renderPlay } from './public/js/play-dom.js';
import { substitutionText } from './public/js/play-dom-notice.js';
import { createPlayState } from './public/js/play-state.js';

it('Given my substitution, When mapped, Then play and pass have distinct notices', () => {
  for (const [action, expected] of [
    ['play', '시간이 지나 대신 냈어요'],
    ['pass', '시간이 지나 대신 패스했어요'],
  ]) {
    assert.equal(
      substitutionText({ mySeat: 2, lastSubstitution: { seat: 2, action } }),
      expected,
    );
  }
});

it('Given another seat, When mapped, Then its name or seat identifies the substitution', () => {
  const view = { mySeat: 1, lastSubstitution: { seat: 0, action: 'play' } };
  assert.equal(
    substitutionText(view),
    '좌석 0 차례가 시간이 지나 대신 진행됐어요',
  );
  view.publicState = { seatSummary: [{ seat: 0, userName: '민우' }] };
  assert.equal(
    substitutionText(view),
    '민우 차례가 시간이 지나 대신 진행됐어요',
  );
});

it('Given a substitution then null, When renderPlay runs, Then notice appears then clears and hides', () => {
  const region = { textContent: '', hidden: true };
  const doc = {
    querySelector: (s) => (s === '[data-play="substitution"]' ? region : null),
  };
  renderPlay(doc, { lastSubstitution: { seat: 0, action: 'play' } });
  assert.equal(region.hidden, false);
  assert.equal(region.textContent, '시간이 지나 대신 냈어요');
  renderPlay(doc, { lastSubstitution: null });
  assert.equal(region.hidden, true);
  assert.equal(region.textContent, '');
});

it('Given room substitution, When stored and read, Then copies remain independent and next null clears', () => {
  const state = createPlayState();
  assert.equal(state.get().lastSubstitution, null);
  const lastSubstitution = { seat: 0, action: 'pass' };
  state.setRoom({ code: 'R1', lastSubstitution });
  lastSubstitution.seat = 3;
  const view = state.get();
  assert.deepEqual(view.lastSubstitution, { seat: 0, action: 'pass' });
  view.lastSubstitution.action = 'play';
  assert.equal(state.get().lastSubstitution.action, 'pass');
  state.setRoom({ lastSubstitution: null });
  assert.equal(state.get().lastSubstitution, null);
});
