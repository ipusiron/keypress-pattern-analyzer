'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../logic.js');
const L = require('../learning.js');
for (const [id, expected] of [
  ['normal', [80, 120, 40, 0]], ['overlap', [100, 60, -40, 0]],
  ['incomplete', [40, 60, null, 1]], ['doubled', [160, 240, 80, 0]]
]) test(id + ': learning sample matches independent fixture', () => {
  const p = L.sample(id), m = p.metrics;
  assert.deepEqual([m.avgDwell, m.avgDD, m.avgFlight, m.incomplete], expected);
  p.events[0].t = 999;
  assert.notEqual(L.sample(id).events[0].t, 999);
});
test('doubling has unit cosine but nonzero signed millisecond differences', () => {
  const result = L.comparison(L.sample('normal'), L.sample('doubled'));
  assert.equal(result.allowed, true);
  assert.ok(Math.abs(result.cosine - 1) < 1e-12);
  assert.deepEqual(result.rows.map(r => r.delta), [80, 120, 40]);
  assert.deepEqual(L.comparison(L.sample('doubled'), L.sample('normal')).rows.map(r => r.delta), [-80, -120, -40]);
});
test('negative UD difference is retained; incomplete comparison never fabricates zero', () => {
  assert.deepEqual(L.comparison(L.sample('normal'), L.sample('overlap')).rows.map(r => r.delta), [20, -60, -80]);
  const r = L.comparison(L.sample('normal'), L.sample('incomplete'));
  assert.equal(r.allowed, false);
  assert.ok(r.reasons.some(x => x.side === 'B' && x.reason === 'incomplete'));
  assert.ok(r.rows.every(x => x.delta === null));
});
for (const flag of ['paste', 'drop', 'replacement', 'edit', 'unknown']) test(flag + ': precise input reason', () => {
  const p = L.sample('normal'); p.context.input[flag] = true;
  assert.deepEqual(L.issues(p), [flag]);
  assert.equal(L.comparison(p, L.sample('normal')).allowed, false);
});
test('input types distinguish paste/drop/replacement/edit/unknown', () => {
  for (const [kind, expected] of [['insertFromPaste', 'paste'], ['insertFromDrop', 'drop'],
    ['insertReplacementText', 'replacement'], ['deleteContentBackward', 'edit'], ['historyUndo', 'edit'],
    ['', 'unknown'], ['newType', 'unknown'], ['insertText', null], ['insertCompositionText', null]]) {
    assert.equal(L.inputKind(kind), expected);
  }
});
test('target, IME, missing input context and unknown key are independent reasons', () => {
  const p = L.sample('normal'); p.context.phrase = 'abc'; p.context.imeUsed = true; delete p.context.input;
  p.metrics.strokes[0].code = 'Unknown';
  assert.deepEqual(L.issues(p), ['inputUnknown', 'imeUsed', 'targetMismatch', 'unknownKey']);
});
test('source and event sequence must match, even with identical final text', () => {
  const a = L.sample('normal'), b = L.sample('normal'); delete b.sampleId;
  assert.ok(L.comparison(a, b).reasons.some(x => x.reason === 'sourceMismatch'));
  b.sampleId = 'normal'; b.metrics.strokes[0].key = 'x';
  assert.ok(L.comparison(a, b).reasons.some(x => x.reason === 'sequenceMismatch'));
});
test('optional input observations round-trip; absent legacy observations remain unknown', () => {
  const raw = { ...L.sample('normal'), name: 'example', timestamp: 1, version: 2 };
  const p = C.validateProfiles([raw])[0];
  assert.deepEqual(C.parseProfiles(C.exportProfiles([p])), [p]);
  assert.equal(p.sampleId, undefined);
  delete raw.context.input;
  assert.ok(L.issues(C.validateProfiles([raw])[0]).includes('inputUnknown'));
  raw.context.input = { ...L.newInput(), observed: 'true' };
  assert.throws(() => C.validateProfiles([raw]));
});
