import { it } from 'node:test';
import assert from 'node:assert/strict';
import { hideLobby, renderLobby } from './public/js/play-lobby-view.js';
function node() {
  const listeners = {};
  const el = {
    className: '',
    textContent: '',
    children: [],
    attrs: {},
    setAttribute: (k, v) => (el.attrs[k] = v),
    appendChild: (c) => el.children.push(c),
    append: (...cs) => el.children.push(...cs),
    replaceChildren: (...cs) => {
      el.children.length = 0;
      el.children.push(...cs);
    },
    addEventListener: (t, fn) => {
      (listeners[t] ??= []).push(fn);
    },
    emit: (t) => {
      for (const fn of listeners[t] ?? []) fn();
    },
  };
  return el;
}
const failWrite = () => Promise.reject(new Error('deny'));
const failView = { navigator: { clipboard: { writeText: failWrite } } };
const picked = {};
const docOf = (section) => ({
  createElement: () => node(),
  querySelector: (sel) => (sel === '[data-play="lobby"]' ? section : null),
  defaultView: failView,
  createRange: () => ({ selectNodeContents: (n) => (picked.node = n) }),
  getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
});
const seats = [
  { seat: 0, userName: '민우', userId: 'u1', isBot: false },
  { seat: 1, userName: '봇 1', userId: null, isBot: true },
];
const stateOf = (extra = {}) => ({
  code: 'AB12',
  link: 'https://game.test/play?code=AB12',
  isHost: true,
  canStart: false,
  seats,
  ...extra,
});
it('방장은 시작 버튼·비방장은 대기 문구', () => {
  const section = node();
  const doc = docOf(section);
  const host = renderLobby(doc, stateOf(), {});
  assert.equal(section.hidden, false);
  assert.equal(host.startBtn.textContent, '시작');
  assert.equal(host.startBtn.disabled, true);
  assert.ok(host.startBtn.className.includes('btn--gold'));
  const ready = renderLobby(doc, stateOf({ canStart: true }), {});
  assert.equal(ready.startBtn.disabled, false);
  const guest = renderLobby(doc, stateOf({ isHost: false }), {});
  assert.equal(guest.startBtn, null);
  const wait = section.children[4].children[0];
  assert.equal(wait.textContent, '방장이 시작하기를 기다리는 중');
  assert.equal(renderLobby(docOf(null), stateOf(), {}), null);
  hideLobby(doc);
  assert.equal(section.hidden, true);
});
it('좌석 목록은 아바타와 이름 렌더', () => {
  const section = node();
  renderLobby(docOf(section), stateOf(), {});
  const list = section.children[3];
  assert.equal(list.children.length, 2);
  assert.equal(list.children[0].children[0].className, 'avatar avatar--sm');
  assert.equal(list.children[0].children[0].children[0].alt, '민우 프로필');
  assert.equal(list.children[0].children[1].textContent, '민우');
  assert.equal(list.children[1].children[1].textContent, '봇 1');
});
it('XSS 문자열은 텍스트로만', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const section = node();
  const one = [{ seat: 0, userName: evil }];
  renderLobby(docOf(section), stateOf({ seats: one }), {});
  const name = section.children[3].children[0].children[1];
  assert.equal(name.textContent, evil);
  assert.equal(name.innerHTML, undefined);
});
it('복사·시작 콜백 호출', async () => {
  const section = node();
  let copied = null;
  let started = 0;
  const ui = renderLobby(docOf(section), stateOf({ canStart: true }), {
    onCopy: (link) => (copied = link),
    onStart: () => (started += 1),
  });
  ui.copyBtn.emit('click');
  assert.equal(copied, 'https://game.test/play?code=AB12');
  ui.startBtn.emit('click');
  assert.equal(started, 1);
  await Promise.resolve();
  assert.equal(picked.node, section.children[2].children[0]);
});
