import axios from 'https://cdn.jsdelivr.net/npm/axios@1.20.0/+esm';
import { currentUser, getClient } from './auth.js';
import { createPlayApi } from './play-api.js';
import { createPlayState, passTurn, submitSelected } from './play-state.js';
import { bindPlay, showMessage } from './play-dom.js';
import { subscribeGame } from './realtime.js';
import {
  announceRound,
  connectPlayChat,
  createStartedRoom,
  errorText,
} from './play-flow.js';
import { createSeatPrivacy } from './play-seat-privacy.js';
import { startWaitingRoom } from './play-lobby.js';
import { renderRoomView } from './play-view.js';
import { createRoomReportContext } from './play-report.js';
import { isPending, startPending, stopPending } from './play-pending.js';
const state = createPlayState();
const seatPrivacy = createSeatPrivacy();
let api = null,
  client = null;
let mySeat = 0,
  lastCommand = null;
let reportContext = {};
function render() {
  renderRoomView(document, state.get(), {
    mySeat,
    client,
    seatPrivacy,
    reportContext,
    origin: `${window.location.protocol}//${window.location.host}`,
    onStart: startLobby,
  });
}
const updateSeatPrivacy = () =>
  seatPrivacy.update(client, state.get().publicState);
const message = (text) => showMessage(document, text ?? '');
const startLobby = () =>
  startWaitingRoom(api, state)
    .then(updateSeatPrivacy)
    .then(render)
    .catch((err) => message(errorText(err)));
async function run(command) {
  if (isPending(document)) return;
  startPending(document, command === submitSelected ? 'submit' : 'pass');
  lastCommand = null;
  try {
    await command(api, state);
  } catch (err) {
    message(errorText(err));
  }
  stopPending(document);
  await updateSeatPrivacy();
  render();
  announceRound(state.get().publicState, lastCommand, message);
}
async function sync() {
  if (isPending(document)) return;
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
async function init() {
  const user = await currentUser();
  if (!user) return;
  client = await getClient();
  api = createPlayApi({
    client,
    axios,
    onResult: (result) => (lastCommand = result),
  });
  const started = await createStartedRoom(api, user, {
    search: window.location.search,
    replaceUrl: (url) => window.history.replaceState(null, '', url),
  });
  mySeat = started.seat;
  const { room } = started;
  state.setRoom({ code: started.joinCode, ...room });
  reportContext = createRoomReportContext(document, { client, user, room });
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
  connectPlayChat({ client, user, state, seatPrivacy, ...reportContext });
}
init().catch((err) => message(errorText(err)));
