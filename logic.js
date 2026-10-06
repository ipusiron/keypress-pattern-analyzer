'use strict';

// Classic script for file://; CommonJS export for dependency-free Node tests.
(function (root) {
  const LIMITS = Object.freeze({ events: 10000, profiles: 50, text: 20000, bytes: 5000000, time: 3600000 });
  const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  function deviation(values) {
    const avg = mean(values);
    return avg === null ? null : Math.sqrt(mean(values.map(value => (value - avg) ** 2)));
  }
  function wpm(text, duration) {
    return duration > 0 ? Array.from(text).length / 5 / (duration / 60000) : null;
  }
  function analyze(events, text = '') {
    const active = new Map();
    const strokes = [];
    let segment = 0;
    for (const event of events) {
      if (event.type === 'break') {
        active.clear();
        segment++;
      } else if (event.type === 'down') {
        if (active.has(event.code)) continue;
        const stroke = { ...event, segment, up: null };
        strokes.push(stroke);
        active.set(event.code, stroke);
      } else if (active.has(event.code)) {
        active.get(event.code).up = event.t;
        active.delete(event.code);
      }
    }
    const dwellTimes = strokes.filter(s => s.up !== null).map(s => s.up - s.t);
    const ddTimes = [];
    const flightTimes = [];
    const digraphs = new Map();
    for (let i = 1; i < strokes.length; i++) {
      const a = strokes[i - 1];
      const b = strokes[i];
      if (a.segment !== b.segment) continue;
      const dd = b.t - a.t;
      const ud = a.up === null ? null : b.t - a.up;
      ddTimes.push(dd);
      if (ud !== null) flightTimes.push(ud);
      // JSON tuple avoids collisions between multi-character key names.
      const key = JSON.stringify([a.key, b.key]);
      if (!digraphs.has(key)) digraphs.set(key, { keys: [a.key, b.key], DD: [], UD: [] });
      const pair = digraphs.get(key);
      pair.DD.push(dd);
      if (ud !== null) pair.UD.push(ud);
    }
    const duration = strokes.length ? events[events.length - 1].t - strokes[0].t : 0;
    return {
      strokes, digraphs, totalKeys: strokes.length, duration,
      incomplete: strokes.length - dwellTimes.length, interruptions: segment,
      avgDwell: mean(dwellTimes), stdDwell: deviation(dwellTimes),
      avgFlight: mean(flightTimes), stdFlight: deviation(flightTimes),
      avgDD: mean(ddTimes), stdDD: deviation(ddTimes),
      wpm: wpm(text, duration), dwellTimes, ddTimes, flightTimes
    };
  }
  function cosine(a, b) {
    const x = [a.avgDwell, a.avgFlight, a.avgDD];
    const y = [b.avgDwell, b.avgFlight, b.avgDD];
    if (![...x, ...y].every(Number.isFinite)) return null;
    const denominator = Math.hypot(...x) * Math.hypot(...y);
    if (!denominator) return null;
    return Math.max(-1, Math.min(1, x.reduce((sum, value, i) => sum + value * y[i], 0) / denominator));
  }
  function validateProfiles(input) {
    const fail = () => { throw new Error('invalidProfiles'); };
    if (!Array.isArray(input) || input.length > LIMITS.profiles) fail();
    return input.map(profile => {
      if (!profile || typeof profile !== 'object' || Array.isArray(profile)) fail();
      if (typeof profile.name !== 'string' || !profile.name.trim() || profile.name.length > 50) fail();
      if (!Number.isSafeInteger(profile.timestamp) || profile.timestamp <= 0) fail();
      if (typeof profile.text !== 'string' || profile.text.length > LIMITS.text) fail();
      if (!Array.isArray(profile.events) || !profile.events.length || profile.events.length > LIMITS.events) fail();
      if (profile.version !== undefined && profile.version !== 2) fail();
      let previousTime = 0;
      const events = profile.events.map(event => {
        if (!event || !['down', 'up', 'break'].includes(event.type)) fail();
        if (!Number.isFinite(event.t) || event.t < previousTime || event.t > LIMITS.time) fail();
        previousTime = event.t;
        if (event.type === 'break') return { type: 'break', t: event.t };
        if (typeof event.code !== 'string' || !event.code || event.code.length > 50) fail();
        if (typeof event.key !== 'string' || !event.key || event.key.length > 50) fail();
        return { type: event.type, code: event.code, key: event.key, t: event.t };
      });
      let context = null;
      if (profile.version === 2) {
        const c = profile.context;
        if (!c || !['fixed', 'custom', 'free'].includes(c.mode) || typeof c.ignoreIME !== 'boolean') fail();
        if (typeof c.phrase !== 'string' || c.phrase.length > LIMITS.text || typeof c.imeUsed !== 'boolean') fail();
        context = { mode: c.mode, phrase: c.phrase, ignoreIME: c.ignoreIME, imeUsed: c.imeUsed };
      }
      const metrics = analyze(events, profile.text);
      if (!metrics.totalKeys) fail();
      return { version: context ? 2 : undefined, name: profile.name.trim(), timestamp: profile.timestamp,
        text: profile.text, events, context, metrics };
    });
  }
  function parseProfiles(json) {
    if (typeof json !== 'string' || new TextEncoder().encode(json).length > LIMITS.bytes) {
      throw new Error('invalidProfiles');
    }
    return validateProfiles(JSON.parse(json));
  }
  function exportProfiles(profiles) {
    return JSON.stringify(profiles.map(({ version, name, timestamp, text, events, context }) =>
      ({ version, name, timestamp, text, events, context })), null, 2);
  }
  function comparable(a, b) {
    return Boolean(a.context && b.context && !a.context.imeUsed && !b.context.imeUsed &&
      a.context.mode === b.context.mode && a.context.phrase === b.context.phrase &&
      a.context.ignoreIME === b.context.ignoreIME && a.text === b.text &&
      !a.metrics.incomplete && !b.metrics.incomplete && !a.metrics.interruptions && !b.metrics.interruptions);
  }
  const api = { LIMITS, mean, deviation, wpm, analyze, cosine, validateProfiles, parseProfiles, exportProfiles, comparable };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KeystrokeCore = Object.freeze(api);
})(globalThis);
