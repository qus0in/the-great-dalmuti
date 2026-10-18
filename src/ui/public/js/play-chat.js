import { avatarUrl } from './avatar.js';
import { createChat } from './chat.js';
import { mountChatPanel } from './chat-panel.js';

function seatName(publicState, userId) {
  const seat = (publicState?.seatSummary || []).find(
    (item) => item.userId === userId,
  );
  return seat?.userName || '';
}

function avatarFor(options) {
  const { room } = options;
  const users = (room.publicState?.seatSummary || []).map(
    (seat) => seat.userId,
  );
  const hidden = options.seatPrivacy.hiddenIdsFor(room.publicState);
  return (message) => {
    const known = users.includes(message.userId);
    return {
      name: message.name,
      url: known ? avatarUrl(options.client, message.userId) : '',
      hidden: !known || hidden.has(message.userId),
    };
  };
}

function mountPanel(options, chat) {
  return (options.mountChatPanelImpl || mountChatPanel)(options.doc, {
    chat,
    isTutorial: false,
    avatarFor: avatarFor(options),
    me: options.me,
    onReport: options.onReport,
  });
}

function createMessageBridge(publicState, pending) {
  const bridge = {
    panel: null,
    receive: (message) => {
      const received =
        message.name === ''
          ? { ...message, name: seatName(publicState, message.userId) }
          : message;
      bridge.panel ? bridge.panel.addMessage(received) : pending.push(received);
    },
  };
  return bridge;
}

export function connectRoomChat(options) {
  if (options.isTutorial || options.room.publicState?.mode === 'tutorial')
    return null;
  const pending = [];
  const bridge = createMessageBridge(options.room.publicState, pending);
  const chat = (options.createChatImpl || createChat)(options.client, {
    gameId: options.room.gameId,
    me: {
      userId: options.user.id,
      name: seatName(options.room.publicState, options.user.id),
    },
    onMessage: bridge.receive,
  });
  const panel = mountPanel(options, chat);
  bridge.panel = panel;
  pending.forEach((message) => panel.addMessage(message));
  options.doc.defaultView?.addEventListener('pagehide', panel.close, {
    once: true,
  });
  return panel;
}

export const connectPlayChat = (options) =>
  connectRoomChat({ ...options, room: options.state.get(), doc: document });
