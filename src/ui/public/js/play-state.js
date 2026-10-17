// 빈 방 상태 (code는 setRoom에서 채운다)
function emptyRoom() {
  return {
    code: null,
    gameId: null,
    version: null,
    publicState: null,
    hand: [],
    selected: [],
  };
}

// 상태 사본을 만들어 외부에서 내부 참조를 바꾸지 못하게 한다
function copyRoom(room) {
  return {
    ...room,
    publicState: room.publicState
      ? JSON.parse(JSON.stringify(room.publicState))
      : null,
    hand: room.hand.map((card) => ({ ...card })),
    selected: [...room.selected],
  };
}

// 새 방 상태로 교체하고 손패에 없는 선택은 버린다
function nextRoom(room, { code = room.code, publicState, hand = [] }) {
  const ids = hand.map((card) => card.id);
  return {
    code,
    gameId: publicState?.gameId ?? null,
    version: publicState?.version ?? null,
    publicState: publicState ?? null,
    hand,
    selected: room.selected.filter((id) => ids.indexOf(id) !== -1),
  };
}

// 손패에 있는 카드만 선택·해제한다
function toggledRoom(room, cardId) {
  if (!room.hand.some((card) => card.id === cardId)) return room;
  const selected = room.selected.includes(cardId)
    ? room.selected.filter((id) => id !== cardId)
    : [...room.selected, cardId];
  return { ...room, selected };
}

// 선택·차례 상태를 보관하는 순수 상태 객체
export function createPlayState() {
  let room = emptyRoom();
  return {
    get: () => copyRoom(room),
    setRoom: (input) => {
      room = nextRoom(room, input);
      return copyRoom(room);
    },
    toggle: (cardId) => {
      room = toggledRoom(room, cardId);
      return copyRoom(room);
    },
    selected: () => [...room.selected],
    clear: () => {
      room = { ...room, selected: [] };
    },
  };
}

// 명령 성공 뒤 최신 방 상태로 다시 맞춘다 (실패하면 선택을 유지한다)
async function resync(api, state, command) {
  const before = state.get();
  if (!before.code) throw new Error('방 코드가 없다');
  await command(before);
  const room = await api.getRoom(before.code);
  state.setRoom({ ...room, code: before.code });
  return state.get();
}

// 선택한 카드를 내고 최신 상태로 동기화한다
export function submitSelected(api, state) {
  return resync(api, state, (before) =>
    api.playCards(before.code, before.version, before.selected),
  );
}

// 차례를 넘기고 최신 상태로 동기화한다
export function passTurn(api, state) {
  return resync(api, state, (before) => api.pass(before.code, before.version));
}
