import { MODERATION_UI } from './features.js';
import { mountReportMenu } from './report-menu.js';

export function createRoomReportContext(
  doc,
  { client, user, room, features } = {},
) {
  if (!user?.id || room?.publicState?.mode === 'tutorial') return {};
  if ((features?.moderationUi ?? MODERATION_UI) === false) return {};
  const menu = mountReportMenu(doc, { client, me: user.id });
  return {
    me: user.id,
    features,
    onReport: ({ targetId, reason }) => menu.open(targetId, reason),
  };
}
