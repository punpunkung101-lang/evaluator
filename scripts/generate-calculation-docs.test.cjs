'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const generator = require('./generate-calculation-docs.cjs');

const root = path.resolve(__dirname, '..');

test('dashboard documents match fresh read-only calculations for all 21 systems', () => {
  const guidePath = path.join(root, 'docs/dashboard-calculation-guide.md');
  const systemsPath = path.join(root, 'docs/dashboard-calculation-by-system.md');
  const guide = fs.readFileSync(guidePath, 'utf8');
  const bySystem = fs.readFileSync(systemsPath, 'utf8');

  assert.equal(guide, generator.guideDoc());
  assert.equal(bySystem, generator.systemDoc());
  const headings = [...bySystem.matchAll(/^## (SYS\d{3}) — /gm)].map(match => match[1]);
  assert.deepEqual(headings, Array.from({ length: 21 }, (_, i) => `SYS${String(i + 1).padStart(3, '0')}`));
  assert.match(bySystem, /^<!-- ไฟล์นี้ถูกสร้างอัตโนมัติ ห้ามแก้ด้วยมือ -->/);
  assert.doesNotMatch(`${guide}\n${bySystem}`, /TODO|placeholder|undefined\/|NaN/);

  for (const doc of [guide, bySystem]) {
    for (const [, href] of doc.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      assert.doesNotMatch(href, /^https?:/);
      const target = path.resolve(path.dirname(doc === guide ? guidePath : systemsPath), href.split('#')[0]);
      assert.ok(fs.existsSync(target), `Missing document link target: ${href}`);
    }
  }
});
