const MAX_LENGTH = 200;
const SEND_INTERVAL = 1000;
const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function validPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (typeof payload.userId !== 'string' || !payload.userId.trim())
    return false;
  if (typeof payload.name !== 'string' || typeof payload.text !== 'string')
    return false;
  if (typeof payload.at !== 'string') return false;
  return (
    ISO_TIMESTAMP.test(payload.at) &&
    new Date(payload.at).toString() !== 'Invalid Date'
  );
}

function broadcastHandler(me, onMessage, state) {
  return ({ payload } = {}) => {
    if (state.closed || !validPayload(payload)) return;
    onMessage({
      userId: payload.userId,
      name: payload.name,
      text: payload.text.slice(0, MAX_LENGTH),
      at: payload.at,
      mine: payload.userId === me.userId,
    });
  };
}

function rejection(text, state) {
  if (state.closed) return 'closed';
  if (typeof text !== 'string') return 'invalid';
  if (!text.trim()) return 'empty';
  if (text.length > MAX_LENGTH) return 'too-long';
  if (state.sending || Date.now() - state.lastSentAt < SEND_INTERVAL) {
    return 'too-fast';
  }
  return null;
}

async function isBlocked(client, userId) {
  try {
    const { data, error } = await client.rpc('is_chat_blocked', {
      target_user_id: userId,
    });
    return Boolean(error) || data === true;
  } catch {
    return true;
  }
}
async function sendText(context, text) {
  const { client, channel, me, state } = context;
  const current = state;
  const reason = rejection(text, current);
  if (reason) return { ok: false, reason };
  current.sending = true;
  try {
    if (await isBlocked(client, me.userId))
      return { ok: false, reason: 'blocked' };
    if (current.closed) return { ok: false, reason: 'closed' };
    const status = await channel.send({
      type: 'broadcast',
      event: 'chat',
      payload: { ...me, text, at: new Date().toISOString() },
    });
    if (current.closed) return { ok: false, reason: 'closed' };
    if (status !== 'ok') return { ok: false, reason: 'send-failed' };
    current.lastSentAt = Date.now();
    return { ok: true };
  } catch {
    return { ok: false, reason: 'send-failed' };
  } finally {
    current.sending = false;
  }
}

function closeChat(client, channel, state) {
  const current = state;
  if (current.closed) return;
  current.closed = true;
  return client.removeChannel(channel);
}
export function createChat(client, { gameId, me, onMessage = () => {} }) {
  const channel = client.channel(`game-chat:${gameId}`, {
    config: { broadcast: { self: true } },
  });
  const state = { closed: false, sending: false, lastSentAt: -Infinity };
  channel.on(
    'broadcast',
    { event: 'chat' },
    broadcastHandler(me, onMessage, state),
  );
  channel.subscribe();
  return {
    send: (text) => sendText({ client, channel, me, state }, text),
    close: () => closeChat(client, channel, state),
  };
}
