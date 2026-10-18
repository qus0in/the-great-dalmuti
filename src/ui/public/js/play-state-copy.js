export function copyHint(hint) {
  return hint ? { ...hint, cards: [...(hint.cards ?? [])] } : null;
}

export function copySubstitution(notice) {
  return notice ? { ...notice } : null;
}

// 상태 사본을 만들어 외부에서 내부 참조를 바꾸지 못하게 한다
export function copyRoom(room) {
  return {
    ...room,
    publicState: room.publicState
      ? JSON.parse(JSON.stringify(room.publicState))
      : null,
    hand: room.hand.map((card) => ({ ...card })),
    selected: [...room.selected],
    hint: copyHint(room.hint),
    lastSubstitution: copySubstitution(room.lastSubstitution),
  };
}
