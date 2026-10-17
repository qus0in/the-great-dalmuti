import { it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlayState,
  passTurn,
  submitSelected,
} from './public/js/play-state.js';

const PUBLIC = { gameId: 'g1', phase: 'playing', version: 3 };
const HAND = [{ id: 'c1' }, { id: 'c2' }];

function room({ version = 3, hand = HAND } = {}) {
  return { code: 'R1', publicState: { ...PUBLIC, version }, hand };
}

function ready(...ids) {
  const state = createPlayState();
  state.setRoom(room());
  for (const id of ids) state.toggle(id);
  return state;
}

function record(calls, kind) {
  return (...args) => calls.push([kind, ...args]);
}

function apiWith(calls, roomResult) {
  return {
    playCards: record(calls, 'play'),
    pass: record(calls, 'pass'),
    getRoom: (code) => {
      calls.push(['get', code]);
      return roomResult;
    },
  };
}

it('Given room, When setRoom, Then fields copy and out-of-hand selection drops', () => {
  const state = ready('c1', 'c2');
  const before = state.get();
  assert.equal(before.code, 'R1');
  assert.equal(before.gameId, 'g1');
  assert.equal(before.version, 3);
  before.selected.push('c3');
  assert.deepEqual(state.selected(), ['c1', 'c2']);
  state.setRoom(room({ hand: [{ id: 'c1' }] }));
  assert.deepEqual(state.selected(), ['c1']);
});

it('Given hand, When toggle repeats or misses, Then only hand cards toggle', () => {
  const state = ready();
  state.toggle('c1');
  state.toggle('c1');
  assert.deepEqual(state.selected(), []);
  state.toggle('c2');
  state.toggle('missing');
  assert.deepEqual(state.selected(), ['c2']);
  state.clear();
  assert.deepEqual(state.selected(), []);
});

it('Given selection, When submitSelected, Then plays with version and resyncs', async () => {
  const calls = [];
  const state = ready('c1', 'c2');
  const after = {
    publicState: { ...PUBLIC, version: 4 },
    hand: [{ id: 'c3' }],
  };
  const result = await submitSelected(apiWith(calls, after), state);
  assert.deepEqual(calls, [
    ['play', 'R1', 3, ['c1', 'c2']],
    ['get', 'R1'],
  ]);
  assert.equal(result.version, 4);
  assert.deepEqual(result.selected, []);
});

it('Given failed play, When submitSelected, Then error is rethrown and selection kept', async () => {
  const error = new Error('boom');
  const api = { playCards: () => Promise.reject(error) };
  const state = ready('c1');
  await assert.rejects(
    () => submitSelected(api, state),
    (err) => err === error,
  );
  assert.deepEqual(state.selected(), ['c1']);
});

it('Given state, When passTurn, Then passes with version and resyncs', async () => {
  const calls = [];
  const state = ready('c1');
  const after = { publicState: { ...PUBLIC, version: 5 }, hand: HAND };
  const result = await passTurn(apiWith(calls, after), state);
  assert.deepEqual(calls, [
    ['pass', 'R1', 3],
    ['get', 'R1'],
  ]);
  assert.equal(result.version, 5);
  assert.deepEqual(result.selected, ['c1']);
});
