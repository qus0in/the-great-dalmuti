export class DomainError extends Error {
  constructor(message, code = 'DOMAIN_ERROR') {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

export const JESTER_RANK = 13;
export const JESTER_COUNT = 2;
export const TOTAL_CARD_COUNT = 80;

export const RANK_NAMES = Object.freeze({
  1: '대달무티',
  2: '대주교',
  3: '시종장',
  4: '남작부인',
  5: '수녀원장',
  6: '기사',
  7: '재봉사',
  8: '석공',
  9: '요리사',
  10: '양치기',
  11: '광부',
  12: '농노',
  13: '어릿광대',
});

export const CARD_DEFINITIONS = Object.freeze([
  ...Array.from({ length: 12 }, (_, i) => {
    const rank = i + 1;
    return {
      rank,
      count: rank,
      name: RANK_NAMES[rank],
      isJester: false,
    };
  }),
  {
    rank: JESTER_RANK,
    count: JESTER_COUNT,
    name: RANK_NAMES[JESTER_RANK],
    isJester: true,
  },
]);

export function createCard(rank, index) {
  if (typeof rank !== 'number' || rank < 1 || rank > 13) {
    throw new DomainError(`Invalid card rank: ${rank}`, 'INVALID_CARD_RANK');
  }
  const isJester = rank === JESTER_RANK;
  const name = RANK_NAMES[rank];
  const id = isJester ? `jester-${index}` : `rank-${rank}-${index}`;
  return { id, rank, name, isJester };
}
