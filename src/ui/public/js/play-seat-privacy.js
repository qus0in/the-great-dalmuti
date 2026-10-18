import { fetchHiddenIds } from './avatar.js';

/* eslint-disable compat/compat -- Set and Promise cache roster privacy for module browsers. */

function seats(publicState) {
  return (publicState?.seatSummary || [])
    .map(({ seat, userId, isBot }) => [seat, userId || null, Boolean(isBot)])
    .sort((a, b) => a[0] - b[0]);
}

function seatKey(publicState) {
  return JSON.stringify(seats(publicState));
}

function userIds(publicState) {
  return [...new Set(
    seats(publicState)
      .filter(([, userId, isBot]) => userId && !isBot)
      .map(([, userId]) => userId),
  )];
}

export function createSeatPrivacy() {
  let requestedKey = null, loadedKey = null, generation = 0;
  let hiddenIds = new Set(), pending = Promise.resolve();

  return {
    update(sb, publicState) {
      const key = seatKey(publicState);
      if (key === requestedKey) return pending;
      requestedKey = key;
      loadedKey = null;
      const ids = userIds(publicState);
      const request = ++generation;
      const result = ids.length ? fetchHiddenIds(sb, ids) : Promise.resolve(new Set());
      pending = result.then((next) => {
        if (request === generation) {
          hiddenIds = next;
          loadedKey = key;
        }
      });
      return pending;
    },
    hiddenIdsFor(publicState) {
      const key = seatKey(publicState);
      return key === loadedKey ? hiddenIds : new Set(userIds(publicState));
    },
    context(publicState, mySeat, sb) {
      return { mySeat, sb, hiddenIds: this.hiddenIdsFor(publicState) };
    },
  };
}
