import axios from 'https://cdn.jsdelivr.net/npm/axios@1.20.0/+esm';
import { currentUser, getClient } from './auth.js';
import { createHttpClient } from './http-client.js';
import { createGameApi } from './game-api.js';
import { createPlayState, passTurn, submitSelected } from './play-state.js';
import { bindPlay, renderPlay, showMessage } from './play-dom.js';
import { subscribeGame } from './realtime.js';
import {
  announceRound,
  createStartedRoom,
  createTokenGetter,
  errorText,
  withRecorder,
} from './play-flow.js';
import { createSeatPrivacy } from './play-seat-privacy.js';

const state = createPlayState();
const seatPrivacy = createSeatPrivacy();
let api = null;
let client = null;
let mySeat = 0;
let lastCommand = null;

function render() {
  const view = state.get();
  renderPlay(document, {
    ...view,
    ...seatPrivacy.context(view.publicState, mySeat, client),
  });
}

const updateSeatPrivacy = () =>
  seatPrivacy.update(client, state.get().publicState);

function message(text) {
  showMessage(document, text ?? '');
}

// 명령 성공 뒤 재렌더, 실패는 메시지로 알리고 선택을 유지한다
async function run(command) {
  lastCommand = null;
  try {
    await command(api, state);
  } catch (err) {
    message(errorText(err));
  }
  await updateSeatPrivacy();
  render();
  announceRound(state.get().publicState, lastCommand, message);
}

// Realtime 알림이 오면 방 상태를 다시 읽어 화면을 맞춘다
async function sync() {
  const { code } = state.get();
  try {
    const room = await api.getRoom(code);
    state.setRoom({ code, ...room });
    await updateSeatPrivacy();
    render();
    announceRound(state.get().publicState, lastCommand, message);
  } catch (err) {
    message(errorText(err));
  }
}

// 세션 확인 → 방 생성·시작 → 첫 렌더 → 조작·Realtime 연결
async function init() {
  const user = await currentUser();
  if (!user) return;
  client = await getClient();
  const getToken = createTokenGetter(client);
  api = withRecorder(
    createGameApi(createHttpClient({ axios, getToken })),
    (result) => {
      lastCommand = result;
    },
  );
  const { joinCode, room, seat } = await createStartedRoom(
    api,
    user,
    window.location.search,
  );
  mySeat = seat;
  state.setRoom({ code: joinCode, ...room });
  await updateSeatPrivacy();
  render();
  bindPlay(document, {
    onToggle: (cardId) => {
      state.toggle(cardId);
      render();
    },
    onSubmit: () => run(submitSelected),
    onPass: () => run(passTurn),
  });
  subscribeGame(client, state.get().gameId, sync);
}

init().catch((err) => message(errorText(err)));
