'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../logic.js');
const ev = (type, code, t) => ({ type, code, key: code.toLowerCase(), t });
const down = (code, t) => ev('down', code, t);
const up = (code, t) => ev('up', code, t);
const sequential = [down('A', 100), up('A', 180), down('B', 220), up('B', 300)];
const overlap = [down('A', 100), down('B', 160), up('A', 200), up('B', 260)];
for (const [name, events, dwell, dd, ud, incomplete] of [
  ['sequential', sequential, [80, 80], [120], [40], 0],
  ['overlap', overlap, [100, 100], [60], [-40], 0],
  ['single', [down('A', 100), up('A', 200)], [100], [], [], 0],
  ['incomplete', [down('A', 100), down('B', 160), up('B', 200)], [40], [60], [], 1]
]) {
  test(name + ': independent reference fixture', () => {
    const m = C.analyze(events);
    assert.deepEqual(m.dwellTimes, dwell);
    assert.deepEqual(m.ddTimes, dd);
    assert.deepEqual(m.flightTimes, ud);
    assert.equal(m.incomplete, incomplete);
    assert.deepEqual([...m.digraphs.values()].flatMap(d => d.UD), ud);
  });
}
test('three-key overlap preserves press order', () => {
  const m = C.analyze([down('A', 0), down('B', 20), down('C', 30), up('B', 40), up('C', 70), up('A', 90)]);
  assert.deepEqual(m.flightTimes, [-70, -10]);
  assert.deepEqual(m.dwellTimes, [90, 20, 40]);
});
test('repeat, orphan release and interrupted segments', () => {
  const m = C.analyze([up('Z', 0), down('A', 10), down('A', 20), { type: 'break', t: 30 },
    up('A', 40), down('A', 50), up('A', 70)]);
  assert.equal(m.totalKeys, 2);
  assert.equal(m.incomplete, 1);
  assert.deepEqual(m.ddTimes, []);
  assert.deepEqual(m.dwellTimes, [20]);
});
test('empty and zero are distinct', () => {
  assert.equal(C.analyze([]).avgDwell, null);
  assert.equal(C.analyze([down('A', 0), up('A', 0)]).avgDwell, 0);
  assert.equal(C.analyze(sequential).duration, 200);
  assert.equal(C.deviation([2, 4]), 1);
});
test('WPM uses Unicode code points / 5 / minutes', () => {
  assert.equal(C.wpm('', 60000), 0);
  assert.equal(C.wpm('abcdefghij', 60000), 2);
  assert.equal(C.wpm('😀abcd', 60000), 1);
  assert.equal(C.wpm('abc', 0), null);
});
test('cosine is scale invariant, not identity probability', () => {
  const a = { avgDwell: 100, avgFlight: 100, avgDD: 200 };
  const b = { avgDwell: 200, avgFlight: 200, avgDD: 400 };
  assert.ok(Math.abs(C.cosine(a, b) - 1) < 1e-12);
  assert.equal(C.cosine({ avgDwell: 0, avgFlight: 0, avgDD: 0 }, a), null);
  assert.equal(C.cosine({}, a), null);
});
const fixture = () => ({ version: 2, name: '<test>', timestamp: 1, text: 'ab', events: sequential,
  context: { mode: 'fixed', phrase: 'ab', ignoreIME: true, imeUsed: false }, metrics: { avgDD: 999 } });
test('recompute imported metrics; export round-trip; detached copy', () => {
  const p = fixture();
  const q = C.validateProfiles([p])[0];
  assert.equal(q.metrics.avgDD, 120);
  p.events = [];
  assert.equal(q.events.length, 4);
  assert.deepEqual(C.parseProfiles(C.exportProfiles([q])), [q]);
});
for (const [name, mutate] of [
  ['null', () => null], ['no events', p => ({ ...p, events: [] })],
  ['negative time', p => ({ ...p, events: [down('A', -1)] })],
  ['unordered', p => ({ ...p, events: [down('A', 20), up('A', 10)] })],
  ['infinity', p => ({ ...p, events: [down('A', Infinity)] })],
  ['missing context', p => ({ ...p, context: null })],
  ['future version', p => ({ ...p, version: 3 })],
  ['long text', p => ({ ...p, text: 'x'.repeat(C.LIMITS.text + 1) })]
]) test('reject ' + name, () => assert.throws(() => C.validateProfiles([fixture(), mutate(fixture())])));
test('profile count, size and event bounds', () => {
  assert.equal(C.validateProfiles(Array.from({ length: 50 }, fixture)).length, 50);
  assert.throws(() => C.validateProfiles(Array.from({ length: 51 }, fixture)));
  assert.throws(() => C.parseProfiles(' '.repeat(C.LIMITS.bytes + 1)));
  const p = fixture();
  p.events = Array.from({ length: 10000 }, (_, i) => ev(i % 2 ? 'up' : 'down', 'A', i));
  assert.equal(C.validateProfiles([p])[0].metrics.totalKeys, 5000);
  p.events.push(up('A', 10000));
  assert.throws(() => C.validateProfiles([p]));
});
test('comparison requires equal recorded conditions; legacy is unknown', () => {
  const a = C.validateProfiles([fixture()])[0];
  const b = C.validateProfiles([fixture()])[0];
  assert.equal(C.comparable(a, b), true);
  b.context.imeUsed = true;
  assert.equal(C.comparable(a, b), false);
  const p = fixture();
  delete p.version;
  const legacy = C.validateProfiles([p])[0];
  assert.equal(legacy.context, null);
  assert.equal(C.comparable(a, legacy), false);
});
