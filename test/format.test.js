'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('source remains readable, not minified', () => {
  const files = ['index.html', 'script.js', 'logic.js', 'messages.js', 'theme-init.js', 'style.css',
    ...fs.readdirSync('test').map(name => 'test/' + name)];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    assert.ok(lines.length >= 5, file);
    lines.forEach((line, i) => assert.ok(line.length <= (file.endsWith('.html') ? 250 : 160), file + ':' + (i + 1)));
  }
});
