import { renderPlay } from './play-dom.js';
import { renderWaitingRoom } from './play-lobby.js';

export function renderRoomView(doc, view, options) {
  const { mySeat, client, seatPrivacy, reportContext, origin, onStart } =
    options;
  renderPlay(doc, {
    ...view,
    ...seatPrivacy.context(view.publicState, mySeat, client),
    ...reportContext,
  });
  renderWaitingRoom(doc, view, { mySeat, origin, onStart });
}
