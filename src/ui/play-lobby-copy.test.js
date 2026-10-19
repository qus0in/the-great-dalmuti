import { it } from 'node:test';
import assert from 'node:assert/strict';
import { copyInviteLink } from './public/js/play-lobby-copy.js';

const linkNode = () => ({
  selected: false,
  select() {
    this.selected = true;
  },
});
const docOf = (writeText) => ({
  defaultView: { navigator: { clipboard: { writeText } } },
  createRange: () => ({ selectNodeContents: () => {} }),
  getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
});
const ok = () => Promise.resolve();
const deny = () => Promise.reject(new Error('deny'));

it('성공 시 복사 문구 반환', async () => {
  const text = await copyInviteLink(docOf(ok), linkNode(), 'x');
  assert.equal(text, '링크를 복사했어요.');
});
it('실패 시 링크 선택과 폴백 문구 반환', async () => {
  const link = linkNode();
  const text = await copyInviteLink(docOf(deny), link, 'x');
  assert.equal(link.selected, true);
  assert.equal(text, '링크를 선택했어요. 직접 복사해 주세요.');
});
