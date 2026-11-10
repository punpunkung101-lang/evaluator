const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    generateMockDataset,
    convertToModels,
    validateDataset
} = require('../../database/mock/generate-mock-data.cjs');

const baselinePath = path.resolve(__dirname, '../../database/mock/baseline-statuses.json');
const baselineStatuses = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

// Systems catalog fixture (all 21 systems)
const systems = Object.keys(baselineStatuses).map((id, index) => ({
    id,
    name: baselineStatuses[id].name,
    sort_order: baselineStatuses[id].sortOrder ?? index
}));

test('mock dataset generation is deterministic', () => {
    const run1 = generateMockDataset(42819);
    const run2 = generateMockDataset(42819);
    assert.deepEqual(run1.users, run2.users);
    assert.deepEqual(run1.evalSeeds, run2.evalSeeds);
    assert.deepEqual(run1.quantSeeds, run2.quantSeeds);
});

test('mock accounts are exactly 40 unique synthetic accounts without duplicate IDs', () => {
    const dataset = generateMockDataset();
    assert.equal(dataset.users.length, 40);
    const ids = new Set(dataset.users.map(u => u.id));
    const usernames = new Set(dataset.users.map(u => u.username));
    assert.equal(ids.size, 40);
    assert.equal(usernames.size, 40);

    for (const user of dataset.users) {
        assert.match(user.id, /^9[0-9]{7}$/);
        assert.match(user.username, /^mock_evaluator_[0-9]{2}$/);
        assert.ok(['student', 'teacher', 'staff'].includes(user.role));
    }
});

test('mock records contain no isDemo flags and no duplicate submission IDs', () => {
    const dataset = generateMockDataset();
    const evalIds = new Set();
    for (const e of dataset.evalSeeds) {
        assert.ok(!e.isDemo);
        assert.ok(!evalIds.has(e.id), `Duplicate evaluation ID: ${e.id}`);
        evalIds.add(e.id);
    }
    const quantIds = new Set();
    for (const q of dataset.quantSeeds) {
        assert.ok(!q.isDemo);
        assert.ok(!quantIds.has(q.id), `Duplicate quant ID: ${q.id}`);
        quantIds.add(q.id);
    }
});

test('evaluator counts per system are 10–20 for active systems and match system constraints', () => {
    const dataset = generateMockDataset();
    const converted = convertToModels(dataset, systems);

    for (const sysId of Object.keys(baselineStatuses)) {
        const comp = converted.computedStatuses[sysId];
        assert.ok(comp, `System ${sysId} must exist in computed statuses`);
        const nEff = comp.effectiveness ? comp.effectiveness.n : 0;
        const nSat = comp.satisfaction ? comp.satisfaction.n : 0;

        if (sysId === 'SYS019' || sysId === 'SYS020') {
            assert.equal(nEff, 0);
            assert.equal(nSat, 0);
        } else if (sysId === 'SYS017') {
            assert.ok(nEff >= 10 && nEff <= 20, `${sysId} nEff expected 10-20, got ${nEff}`);
            assert.equal(nSat, 0);
        } else if (sysId === 'SYS018') {
            assert.equal(nEff, 0);
            assert.ok(nSat >= 10 && nSat <= 20, `${sysId} nSat expected 10-20, got ${nSat}`);
        } else {
            assert.ok(nEff >= 10 && nEff <= 20, `${sysId} nEff expected 10-20, got ${nEff}`);
            assert.ok(nSat >= 10 && nSat <= 20, `${sysId} nSat expected 10-20, got ${nSat}`);
        }
    }
});

test('all 21 systems match baseline status, summary, and preliminary flags', () => {
    const dataset = generateMockDataset();
    const converted = convertToModels(dataset, systems);
    const errors = validateDataset(converted.computedStatuses, baselineStatuses);
    assert.deepEqual(errors, []);
});

test('dates span all 7 months from May to November 2026', () => {
    const dataset = generateMockDataset();
    const months = new Set();
    for (const e of dataset.evalSeeds) {
        months.add(e.submittedAt.slice(0, 7));
    }
    const expectedMonths = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
    for (const m of expectedMonths) {
        assert.ok(months.has(m), `Expected month ${m} to be present in dataset`);
    }
});
