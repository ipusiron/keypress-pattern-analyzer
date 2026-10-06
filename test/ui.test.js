'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const M = require('../messages.js');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');
test('dictionaries have equal keys and array lengths', () => {
  assert.deepEqual(Object.keys(M.ja).sort(), Object.keys(M.en).sort());
  for (const key of Object.keys(M.ja)) {
    assert.equal(typeof M.en[key], typeof M.ja[key]);
    if (Array.isArray(M.ja[key])) assert.equal(M.en[key].length, M.ja[key].length);
    assert.ok(M.en[key].length);
  }
  for (const match of js.matchAll(/\b(?:t|notify|stopCapture)\('([a-zA-Z]+)'\)/g)) assert.ok(M.en[match[1]], match[1]);
  assert.doesNotMatch(js, /[ぁ-んァ-ヶ一-龯]/);
});
test('CSP, external classic scripts and accessible controls', () => {
  assert.match(html, /script-src 'self'; style-src 'self'/);
  assert.match(html, /name="referrer"/);
  assert.doesNotMatch(html, /frame-ancestors|unsafe-inline|unsafe-eval|http-equiv="X-Frame/);
  assert.doesNotMatch(html, /\sstyle=|\son\w+=|type="module"/);
  for (const file of ['logic.js', 'messages.js', 'theme-init.js', 'script.js']) assert.ok(html.includes(file));
  for (const id of ['status', 'helpDialog', 'languageToggle', 'btnDelete', 'comparison']) {
    assert.equal(html.split('id="' + id + '"').length - 1, 1);
  }
  assert.match(html, /role="status"/);
  assert.doesNotMatch(js, /console\.log|eval\(/);
});
test('authentication scoring is not part of the result engine', () => {
  assert.doesNotMatch(js, /generateDetailedSummary|benchmarks|securityScore|typingStyle/);
  assert.match(M.en.interpretation, /cannot assess identity/);
  assert.match(M.en.cosineNote, /not an identity probability/);
});
function luminance(hex) {
  const values = hex.match(/[a-f\d]{2}/gi).map(x => parseInt(x, 16) / 255)
    .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
}
test('light and dark text and muted text meet 4.5:1 on panels', () => {
  const css = fs.readFileSync('style.css', 'utf8');
  for (const selector of [':root', ':root.light-mode']) {
    const block = css.slice(css.indexOf(selector + (selector === ':root' ? '{' : ' {'))).split('}')[0];
    const value = name => block.match(new RegExp('--' + name + ':\\s*(#[a-f\\d]{6})', 'i'))[1];
    for (const name of ['text', 'muted']) {
      const values = [luminance(value(name)), luminance(value('panel'))].sort((a, b) => b - a);
      assert.ok((values[0] + .05) / (values[1] + .05) >= 4.5, selector + ' ' + name);
    }
  }
});
