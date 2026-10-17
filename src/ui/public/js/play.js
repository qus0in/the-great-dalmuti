import axios from 'https://cdn.jsdelivr.net/npm/axios@1.20.0/+esm';
import { currentUser, getClient } from './auth.js';
import { createHttpClient } from './http-client.js';
import { createGameApi } from './game-api.js';
import { createPlayState, passTurn, submitSelected } from './play-state.js';
import { bindPlay, renderPlay, showMessage } from './play-dom.js';
import { subscribeGame } from './realtime.js';
import { createTokenGetter, rankingText, withRecorder } from './play-flow.js';

const state = createPlayState();
let api = null;
let mySeat = 0;
let lastCommand = null;

function render() {
  renderPlay(document, { ...state.get(), mySeat });
}

function message(text) {
  showMessage(document, text ?? '');
}

function errorText(err) {
  return err.title || err.detail || err.message;
}

// 라운드 종료 순위는 기록한 마지막 명령 응답으로 안내한다
function announce() {
  const { publicState } = state.get();
  const text = rankingText(lastCommand);
  if (text) message(text);
  else if (publicState && publicState.phase === 'finished')
    message('라운드 종료');
}

// 명령 성공 뒤 재렌더, 실패는 메시지로 알리고 선택을 유지한다
async function run(command) {
  lastCommand = null;
  try {
    await command(api, state);
  } catch (err) {
    message(errorText(err));
  }
  render();
  announce();
}

// Realtime 알림이 오면 방 상태를 다시 읽어 화면을 맞춘다
async function sync() {
  const { code } = state.get();
  try {
    const room = await api.getRoom(code);
    state.setRoom({ code, ...room });
    render();
    announce();
  } catch (err) {
    message(errorText(err));
  }
}

// 세션 확인 → 방 생성·시작 → 첫 렌더 → 조작·Realtime 연결
async function init() {
  const user = await currentUser();
  if (!user) return;
  const client = await getClient();
  const getToken = createTokenGetter(client);
  api = withRecorder(
    createGameApi(createHttpClient({ axios, getToken })),
    (result) => {
      lastCommand = result;
    },
  );
  const created = await api.createRoom();
  const { joinCode } = created.game;
  const mine = created.seats.find((seat) => seat.userId === user.id);
  mySeat = mine ? mine.seat : 0;
  await api.startGame(joinCode);
  const room = await api.getRoom(joinCode);
  state.setRoom({ code: joinCode, ...room });
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
