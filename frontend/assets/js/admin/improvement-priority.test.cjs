const test = require('node:test');
const assert = require('node:assert/strict');
const Priority = require('./improvement-priority.js');

const system = (id, sort_order = 1) => ({ id, name: id, sort_order });
const effect = (afterScore, summary = 'similar', n = 5, coverage = 100) => ({
    afterScore, summary, n, coverage,
    metrics: [
        { scored: true, scoreBefore: 70, scoreAfter: 90 },
        { scored: true, scoreBefore: 90, scoreAfter: 70 },
        { scored: false, scoreBefore: null, scoreAfter: null }
    ]
});
const satisfaction = (average, n = 5) => ({ average, n });

test('normalizes valid satisfaction scores from 1–5 to 0–100', () => {
    assert.equal(Priority.normalizeSatisfaction(1), 0);
    assert.equal(Priority.normalizeSatisfaction(3), 50);
    assert.equal(Priority.normalizeSatisfaction(5), 100);
    assert.equal(Priority.normalizeSatisfaction(0.99), null);
    assert.equal(Priority.normalizeSatisfaction(5.01), null);
    assert.equal(Priority.normalizeSatisfaction(null), null);
});

test('status boundaries follow configured thresholds and before-better takes precedence', () => {
    const classify = (combined, summary = 'similar', average = null) => {
        const satScore = average === null ? null : Priority.normalizeSatisfaction(average);
        const effectivenessScore = satScore === null ? combined : combined * 2 - satScore;
        return Priority.summarizeSystem(
            system('SYS001'),
            { afterScore: effectivenessScore, summary, n: 5, coverage: 100 },
            average === null ? null : satisfaction(average)
        ).status;
    };
    assert.equal(classify(49.9), 'improve');
    assert.equal(classify(50), 'watch');
    assert.equal(classify(69.9), 'watch');
    assert.equal(classify(70), 'good');
    assert.equal(classify(70, 'before-better'), 'improve');
    assert.equal(classify(70, 'similar', 2.60), 'improve');
    assert.equal(classify(70, 'similar', 2.61), 'watch');
    assert.equal(classify(70, 'similar', 3.40), 'watch');
    assert.equal(classify(70, 'similar', 3.41), 'good');
});

test('uses whichever score exists and marks no-data only when both are absent', () => {
    const effectivenessOnly = Priority.summarizeSystem(system('SYS001'), effect(60), null);
    const satisfactionOnly = Priority.summarizeSystem(system('SYS002'), null, satisfaction(3.8));
    const noData = Priority.summarizeSystem(system('SYS003'), null, null);
    assert.equal(effectivenessOnly.combined, 60);
    assert.equal(effectivenessOnly.status, 'watch');
    assert.equal(satisfactionOnly.combined, 70);
    assert.equal(satisfactionOnly.status, 'good');
    assert.equal(noData.combined, null);
    assert.equal(noData.status, 'no-data');
});

test('low sample and preliminary coverage add caution flags without replacing the status', () => {
    const row = Priority.summarizeSystem(system('SYS001'), effect(90, 'after-better', 4, 70), satisfaction(4.5, 3));
    assert.equal(row.status, 'good');
    assert.equal(row.lowSample, true);
    assert.equal(row.preliminary, true);
});

test('counts only scored metrics whose normalized after score exceeds before', () => {
    const row = Priority.summarizeSystem(system('SYS001'), effect(90), satisfaction(4));
    assert.deepEqual(row.metricImprovement, { improved: 1, total: 2 });
});

test('ranks status first, then lower combined score, then system sort order', () => {
    const rows = Priority.rankSystems(
        [system('good-late', 8), system('improve-high', 2), system('watch-late', 7), system('no-data', 1), system('improve-low', 3), system('good-early', 1)],
        {
            'good-late': { afterScore: 100, summary: 'after-better', n: 5, coverage: 100 },
            'improve-high': { afterScore: 20, summary: 'before-better', n: 5, coverage: 100 },
            'watch-late': { afterScore: 70, summary: 'similar', n: 5, coverage: 100 },
            'improve-low': { afterScore: 10, summary: 'before-better', n: 5, coverage: 100 },
            'good-early': { afterScore: 100, summary: 'after-better', n: 5, coverage: 100 }
        },
        { 'good-late': { average: 5, n: 5 }, 'improve-high': { average: 2, n: 5 }, 'watch-late': { average: 3.8, n: 5 }, 'improve-low': { average: 2.5, n: 5 }, 'good-early': { average: 5, n: 5 } }
    );
    assert.deepEqual(rows.map(row => row.systemId), [
        'improve-high', 'improve-low', 'watch-late', 'good-early', 'good-late', 'no-data'
    ]);
});

test('mock sample with strong scores averages effectiveness and satisfaction', () => {
    const row = Priority.summarizeSystem(
        system('SYS001'),
        { afterScore: 100, summary: 'after-better', n: 5, coverage: 100 },
        satisfaction(4.52, 5)
    );
    assert.ok(Math.abs(row.satisfactionScore - 88) < 1e-10);
    assert.ok(Math.abs(row.combined - 94) < 1e-10);
    assert.equal(row.status, 'good');
});
