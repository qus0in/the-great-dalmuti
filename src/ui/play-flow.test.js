import { it } from 'node:test';
import assert from 'node:assert/strict';
import { rankingText } from './public/js/play-flow.js';

const SEATS = [
  { seat: 0, userName: '방장' },
  { seat: 1, userName: '봇 1' },
  { seat: 2, userName: '봇 2' },
  { seat: 3, userName: '봇 3' },
];

it('Given rankings and seat names, When rankingText, Then position, rank, name are shown', () => {
  const result = {
    publicState: { seatSummary: SEATS },
    rankings: [
      { playerId: 2, rank: '대달무티' },
      { playerId: '1', rank: '소달무티' },
      { playerId: 0, rank: '소농노' },
      { playerId: 3, rank: '대농노' },
    ],
  };
  assert.equal(
    rankingText(result),
    '라운드 종료 — 1위 대달무티 봇 2, 2위 소달무티 봇 1, 3위 소농노 방장, 4위 대농노 봇 3',
  );
});

it('Given no seat summary, When rankingText, Then falls back to seat number', () => {
  const result = { rankings: [{ playerId: '3', rank: '대농노' }] };
  assert.equal(rankingText(result), '라운드 종료 — 1위 대농노 좌석 3');
});

it('Given missing rankings, When rankingText, Then null', () => {
  assert.equal(rankingText({}), null);
  assert.equal(rankingText(null), null);
});
