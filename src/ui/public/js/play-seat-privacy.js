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
  return [
    ...new Set(
      seats(publicState)
        .filter(([, userId, isBot]) => userId && !isBot)
        .map(([, userId]) => userId),
    ),
  ];
}

function updatePrivacy({ sb, publicState, state, setState }) {
  const key = seatKey(publicState);
  if (key === state.requestedKey) return state.pending;
  const ids = userIds(publicState);
  const request = state.generation + 1;
  const result = ids.length
    ? fetchHiddenIds(sb, ids)
    : Promise.resolve(new Set());
  const pending = result.then((next) => {
    setState((current) => {
      if (request !== current.generation) return current;
      return { ...current, hiddenIds: next, loadedKey: key };
    });
  });
  setState((current) => ({
    ...current,
    requestedKey: key,
    loadedKey: null,
    generation: request,
    pending,
  }));
  return pending;
}

export function createSeatPrivacy() {
  let state = {
    requestedKey: null,
    loadedKey: null,
    generation: 0,
    hiddenIds: new Set(),
    pending: Promise.resolve(),
  };
  const setState = (update) => {
    state = update(state);
  };
  return {
    update(sb, publicState) {
      return updatePrivacy({ sb, publicState, state, setState });
    },
    hiddenIdsFor(publicState) {
      const key = seatKey(publicState);
      return key === state.loadedKey
        ? state.hiddenIds
        : new Set(userIds(publicState));
    },
    context(publicState, mySeat, sb) {
      return { mySeat, sb, hiddenIds: this.hiddenIdsFor(publicState) };
    },
  };
}
