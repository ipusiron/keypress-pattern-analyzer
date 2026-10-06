'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const C = require('../logic.js');
const L = require('../learning.js');
const { createHash } = require('node:crypto');
const files = ['README.md', 'README.en.md'];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  test(file + ': learning means and signed differences match all four examples', () => {
    const rows = [...text.matchAll(/^\| (normal|overlap|incomplete|doubled) \| (-?\d+) \| (-?\d+) \| (-?\d+|—) \| ([^|]+) \|$/gm)];
    assert.equal(rows.length, 4);
    for (const [, id, dwell, dd, ud, delta] of rows) {
      const p = L.sample(id), r = L.comparison(L.sample('normal'), p);
      const expected = x => x === '—' ? null : Number(x);
      assert.deepEqual([p.metrics.avgDwell, p.metrics.avgDD, p.metrics.avgFlight], [dwell, dd, ud].map(expected));
      assert.deepEqual(r.rows.map(x => x.delta), delta.split(' / ').map(expected));
    }
  });
  test(file + ': four timing examples execute exactly', () => {
    const rows = [...text.matchAll(/^\| (sequential|overlap|single|incomplete) \| (.+) \| (.+) \| (.+) \| (.+) \| (\d+) \|$/gm)];
    assert.equal(rows.length, 4);
    for (const row of rows) {
      const events = row[2].split(', ').map(item => {
        const [, code, direction, timestamp] = /^([AB])([↓↑])(\d+)$/.exec(item);
        return { type: direction === '↓' ? 'down' : 'up', code, key: code.toLowerCase(), t: Number(timestamp) };
      });
      const m = C.analyze(events);
      const values = value => value === '—' ? [] : value.split(',').map(Number);
      assert.deepEqual(m.dwellTimes, values(row[3]));
      assert.deepEqual(m.ddTimes, values(row[4]));
      assert.deepEqual(m.flightTimes, values(row[5]));
      assert.equal(m.incomplete, Number(row[6]));
    }
  });
  test(file + ': limits and relative links', () => {
    const limits = [...text.matchAll(/^\| [^|]+ \| (\d+) \|$/gm)].map(m => Number(m[1]));
    assert.deepEqual(limits, [C.LIMITS.events, C.LIMITS.time, C.LIMITS.text, 50, C.LIMITS.profiles, C.LIMITS.bytes]);
    const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map(m => m[1]).filter(x => !/^https?:/.test(x));
    assert.ok(links.length >= 6);
    for (const link of links) assert.ok(fs.existsSync(link), link);
    assert.doesNotMatch(text, /previously|used to|earlier version|formerly|以前は|改修前|分かる/);
    for (const section of text.split(/^## /m)) assert.ok((section.match(/\*\*/g) || []).length <= 4);
  });
}
test('README headings match by order and level', () => {
  const headings = files.map(file => [...fs.readFileSync(file, 'utf8').matchAll(/^(#+) (.+)$/gm)]
    .map(m => [m[1], m[2]]));
  assert.equal(headings[0].length, 17);
  assert.deepEqual(headings[0].map(h => h[0]), headings[1].map(h => h[0]));
  const topics = ['デモページ', 'スクリーンショット', '使い方', '機能詳細', '計算例と定義', '比較の条件と限界',
    '保存とJSON', 'ユースケース', '安全性と計測の限界', 'トラブルシューティング', '技術文書と関連資料',
    'テスト', 'ディレクトリー構造', '動作環境', 'ライセンス', 'このツールについて'];
  const english = ['Demo', 'Screenshots', 'Usage', 'Features', 'Calculation examples and definitions',
    'Comparison conditions and limits', 'Storage and JSON', 'Use cases', 'Safety and measurement limits',
    'Troubleshooting', 'Technical documentation and resources', 'Tests', 'Directory structure', 'Requirements', 'License', 'About this tool'];
  topics.forEach((topic, i) => {
    assert.ok(headings[0][i + 1][1].endsWith(topic));
    assert.ok(headings[1][i + 1][1].endsWith(english[i]));
  });
});
test('metadata structure and identity are preserved', () => {
  const current = fs.readFileSync('README.md', 'utf8').split('-->')[0];
  // Recorded from baseline ca4c4bd; independent of Git checkout depth in CI.
  const baselineHash = '38898dbf46cfc0388a08400ac5a6b2bec6acde58dfa3bf136986b065251f3cab';
  assert.equal(createHash('sha256').update(current.replace(/\r/g, '')).digest('hex'), baselineHash);
  for (const key of ['category_ja', 'category_en', 'tags']) assert.match(current, new RegExp(key + ':\\r?\\n  - '));
});
test('directory tree describes every tracked/source file', () => {
  const expected = ['index.html', 'script.js', 'logic.js', 'learning.js', 'learning.test.js', 'messages.js',
    'theme-init.js', 'style.css', 'package.json',
    'logic.test.js', 'ui.test.js', 'readme.test.js', 'format.test.js', 'test.yml', 'README.md', 'README.en.md',
    'ALGORITHMS.md', 'TECHNICAL.md', 'CLAUDE.md', 'LICENSE', '.gitignore', '.nojekyll'];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const tree = text.split('```')[1];
    for (const name of expected) assert.ok(tree.includes(name + ' '), name);
    for (const line of tree.trim().split('\n')) assert.match(line, /# \S/);
  }
});
