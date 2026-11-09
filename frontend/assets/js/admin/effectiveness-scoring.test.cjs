const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeSystem, sideScore, satisfactionLevel, summarizeSatisfaction, THRESHOLDS } = require('./effectiveness-scoring.js');

const examples = [
    { id: 'done_time', weight: 12, direction: 'decrease', unit: { th: 'วัน' } },
    { id: 'on_time', weight: 10, direction: 'increase', unit: { th: '%' } },
    { id: 'sat_requester', weight: 15, direction: 'increase', unit: { th: '1–5' } }
];
function record(userId, date, values, config = {}) {
    return { id: `${userId}-${date}`, userId, systemId: 'SYS001', submittedAt: date, config: { metrics: Object.keys(values).map(id => ({ id, active: true })), ...config }, values };
}

test('relative scores handle both directions and zero boundaries', () => {
    assert.deepEqual(sideScore(10, 5, 'decrease'), { before: 50, after: 100 });
    assert.deepEqual(sideScore(2, 8, 'increase'), { before: 25, after: 100 });
    assert.deepEqual(sideScore(0, 0, 'decrease'), { before: 100, after: 100 });
    assert.deepEqual(sideScore(4, 0, 'decrease'), { before: 0, after: 100 });
});

test('averages paired known values, maps example weights and converts 1–5 before scoring', () => {
    const rows = [
        record('u1', '2026-01-01', { done_time: { status: 'known', before: 10, after: 5 }, on_time: { status: 'known', before: 50, after: 75 }, sat_requester: { status: 'known', before: 3, after: 4 } }),
        record('u2', '2026-01-01', { done_time: { status: 'known', before: 20, after: 10 }, on_time: { status: 'known', before: 75, after: 100 }, sat_requester: { status: 'known', before: 4, after: 5 } })
    ];
    const result = summarizeSystem(rows, examples);
    assert.equal(result.n, 2);
    assert.equal(result.lowSample, true);
    assert.equal(result.coverage, 37);
    assert.equal(result.metrics.find(item => item.id === 'done_time').before, 15);
    assert.equal(result.metrics.find(item => item.id === 'done_time').after, 7.5);
    assert.equal(result.metrics.find(item => item.id === 'sat_requester').before, 3.5);
    assert.equal(result.metrics.find(item => item.id === 'sat_requester').scoreBefore, 71.42857142857143);
    assert.equal(result.summary, 'preliminary');
});

test('legacy raw backend records use profile.id when deduplicating evaluators', () => {
    const legacy = record('temporary', '2026-03-01', { done_time: { status: 'known', before: 10, after: 5 } });
    delete legacy.userId;
    legacy.profile = { id: 'legacy-user-1' };
    const result = summarizeSystem([legacy], examples);
    assert.equal(result.n, 1);
    assert.equal(result.metrics.find(item => item.id === 'done_time').after, 5);
});

test('latest evaluator record wins; demo, unknown, incomplete and invalid metrics do not score', () => {
    const rows = [
        record('u1', '2026-01-01', { done_time: { status: 'known', before: 10, after: 5 }, on_time: { status: 'unknown', before: null, after: null } }),
        record('u1', '2026-02-01', { done_time: { status: 'known', before: 20, after: 10 }, on_time: { status: 'known', before: 20, after: null }, sat_requester: { status: 'known', before: -1, after: 3 } }),
        record('u2', '2026-02-02', { done_time: { status: 'known', before: 4, after: 2 } }, { isDemo: true })
    ];
    const result = summarizeSystem(rows, examples);
    assert.equal(result.n, 1);
    assert.equal(result.records, 1);
    assert.equal(result.excludedDemo, 1);
    assert.equal(result.coverage, 12);
    assert.ok(result.warnings.includes('sat_requester'));
    assert.equal(result.metrics.find(item => item.id === 'on_time').scored, false);
});

test('empty quantitative data is reported as no data rather than preliminary', () => {
    assert.equal(summarizeSystem([], examples).summary, 'no-data');
});

test('outside-criteria metrics remain visible but never contribute weight', () => {
    const result = summarizeSystem([record('u1', '2026-01-01', { time: { status: 'known', before: 8, after: 4 }, done_time: { status: 'known', before: 10, after: 5 } })], examples);
    assert.equal(result.metrics.find(item => item.id === 'time').outsideCriteria, true);
    assert.equal(result.coverage, 12);
});

test('coverage and difference decision boundaries are explicit constants', () => {
    assert.equal(THRESHOLDS.minimumCoverage, 80);
    assert.equal(THRESHOLDS.difference, 5);
    assert.equal(satisfactionLevel(4.21), 'very-high');
    assert.equal(satisfactionLevel(4.20), 'high');
    assert.equal(satisfactionLevel(3.41), 'high');
    assert.equal(satisfactionLevel(2.61), 'moderate');
    assert.equal(satisfactionLevel(1.81), 'low');
    assert.equal(satisfactionLevel(1), 'very-low');
    assert.equal(satisfactionLevel(5.1), null);
});

test('80 percent coverage is sufficient; a difference below five remains inconclusive', () => {
    const definitions = [
        { id: 'a', weight: 40, direction: 'increase' },
        { id: 'b', weight: 40, direction: 'increase' },
        { id: 'c', weight: 19, direction: 'increase' },
        { id: 'd', weight: 1, direction: 'increase' }
    ];
    const exact = record('u1', '2026-01-01', {
        a: { status: 'known', before: 100, after: 104 },
        b: { status: 'known', before: 100, after: 104 }
    });
    const result = summarizeSystem([exact], definitions);
    assert.equal(result.coverage, 80);
    assert.equal(result.summary, 'similar');
    const below = summarizeSystem([record('u1', '2026-01-01', { a: { status: 'known', before: 100, after: 100 } })], definitions);
    assert.equal(below.coverage, 40);
    assert.equal(below.summary, 'preliminary');
});

test('satisfaction counts only each evaluator’s latest non-demo record per system', () => {
    const rows = [
        { evaluatorId: 'u1', systemId: 'SYS001', submittedAt: '2026-01-01', satisfactionAnswers: [2, 2] },
        { evaluatorId: 'u1', systemId: 'SYS001', submittedAt: '2026-02-01', satisfactionAnswers: [4, 4] },
        { evaluatorId: 'u2', systemId: 'SYS001', submittedAt: '2026-02-02', satisfactionAnswers: [5] },
        { evaluatorId: 'u3', systemId: 'SYS001', submittedAt: '2026-02-03', satisfactionAnswers: [5], config: { isDemo: true } }
    ];
    const [result] = summarizeSatisfaction(rows);
    assert.equal(result.n, 2);
    assert.equal(result.average, 4.5);
    assert.equal(result.level, 'very-high');
    assert.equal(result.lowSample, true);
});
