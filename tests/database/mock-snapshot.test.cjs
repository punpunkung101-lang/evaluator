const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const { buildSnapshot } = require('../../database/mock/export-mock-snapshot.cjs');

const root = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(root, 'database/evaluator.db'), { readOnly: true });
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'frontend/assets/data/mock-snapshot.js'), 'utf8'), sandbox);
const committed = JSON.parse(JSON.stringify(sandbox.window.EvaluatorMockSnapshot));

test('committed mock-snapshot.js is in sync with the mock rows in evaluator.db', () => {
    assert.deepEqual(committed, JSON.parse(JSON.stringify(buildSnapshot(db))),
        'run: node database/mock/export-mock-snapshot.cjs');
});

test('snapshot contains only mock-marked rows and covers every active system', () => {
    assert.ok(committed.evaluations.length > 0 && committed.quantitative.length > 0);
    assert.ok(committed.evaluations.every(r => r.id.startsWith('mock-eval-')));
    assert.ok(committed.quantitative.every(r => String(r.id).startsWith('mock-quant-')));
    assert.equal(committed.systems.length, 21);
    assert.ok(committed.systems.every(s => Array.isArray(committed.questions[s.id])));
});
