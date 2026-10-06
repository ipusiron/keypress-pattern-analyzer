'use strict';
(function (root) {
  const Core = typeof module !== 'undefined' && module.exports ? require('./logic.js') : root.KeystrokeCore;
  const sampleIds = Object.freeze(['normal', 'overlap', 'incomplete', 'doubled']);
  function newInput() {
    return { observed: false, paste: false, drop: false, replacement: false, edit: false, unknown: false };
  }
  // Flags describe browser notifications, not the physical source of an input.
  function inputKind(type) {
    if (['insertFromPaste', 'insertFromPasteAsQuotation', 'paste'].includes(type)) return 'paste';
    if (['insertFromDrop', 'drop'].includes(type)) return 'drop';
    if (['insertReplacementText', 'insertFromYank'].includes(type)) return 'replacement';
    if (/^(delete|history)/.test(type) || type === 'insertTranspose') return 'edit';
    if (['insertText', 'insertLineBreak', 'insertParagraph', 'insertCompositionText'].includes(type)) return null;
    return 'unknown';
  }
  function sample(id) {
    if (!sampleIds.includes(id)) throw new Error('invalidSample');
    const rows = id === 'overlap' ? [['down', 'A', 100], ['down', 'B', 160], ['up', 'A', 200], ['up', 'B', 260]] :
      id === 'incomplete' ? [['down', 'A', 100], ['down', 'B', 160], ['up', 'B', 200]] :
      [['down', 'A', 100], ['up', 'A', 180], ['down', 'B', 220], ['up', 'B', 300]];
    const events = rows.map(([type, key, t]) => ({ type, key: key.toLowerCase(), code: 'Key' + key,
      t: id === 'doubled' ? t * 2 : t }));
    const context = { mode: 'custom', phrase: 'ab', ignoreIME: true, imeUsed: false,
      input: { ...newInput(), observed: true } };
    return { sampleId: id, text: 'ab', events, context, metrics: Core.analyze(events, 'ab') };
  }
  function issues(profile) {
    const reasons = [];
    const c = profile.context;
    const m = profile.metrics;
    if (!c) reasons.push('contextUnknown');
    else {
      if (!c.input?.observed) reasons.push('inputUnknown');
      for (const key of ['paste', 'drop', 'replacement', 'edit', 'unknown']) {
        if (c.input?.[key]) reasons.push(key);
      }
      if (c.imeUsed) reasons.push('imeUsed');
      if (c.mode !== 'free' && c.phrase !== profile.text) reasons.push('targetMismatch');
    }
    if (m.incomplete) reasons.push('incomplete');
    if (m.interruptions) reasons.push('interrupted');
    if (![m.avgDwell, m.avgDD, m.avgFlight].every(Number.isFinite)) reasons.push('insufficient');
    else if (!Math.hypot(m.avgDwell, m.avgDD, m.avgFlight)) reasons.push('zeroVector');
    if (m.strokes.some(s => s.code === 'Unknown')) reasons.push('unknownKey');
    if (m.strokes.some(s => ['Backspace', 'Delete'].includes(s.key)) && !reasons.includes('edit')) reasons.push('edit');
    return reasons;
  }
  function comparison(a, b) {
    const reasons = [];
    for (const [side, profile] of [['A', a], ['B', b]]) {
      for (const reason of issues(profile)) reasons.push({ side, reason });
    }
    if (a.context && b.context) {
      for (const field of ['mode', 'phrase', 'ignoreIME']) {
        if (a.context[field] !== b.context[field]) reasons.push({ side: '', reason: field + 'Mismatch' });
      }
    }
    if (a.text !== b.text) reasons.push({ side: '', reason: 'textMismatch' });
    if (Boolean(a.sampleId) !== Boolean(b.sampleId)) reasons.push({ side: '', reason: 'sourceMismatch' });
    const sequence = p => JSON.stringify(p.metrics.strokes.map(s => [s.code, s.key]));
    if (sequence(a) !== sequence(b)) reasons.push({ side: '', reason: 'sequenceMismatch' });
    const allowed = reasons.length === 0;
    return { reasons, allowed, cosine: allowed ? Core.cosine(a.metrics, b.metrics) : null,
      rows: ['avgDwell', 'avgDD', 'avgFlight'].map(key => ({ key, a: a.metrics[key], b: b.metrics[key],
        delta: allowed ? b.metrics[key] - a.metrics[key] : null })) };
  }
  const api = { newInput, inputKind, sampleIds, sample, issues, comparison };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KeystrokeLearning = Object.freeze(api);
})(globalThis);
