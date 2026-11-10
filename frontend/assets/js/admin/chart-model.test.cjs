const test = require('node:test');
const assert = require('node:assert/strict');
const ChartModel = require('./chart-model.js');

test('clamp restricts numbers within 0-100 and returns null for non-finite', () => {
    assert.equal(ChartModel.clamp(-15), 0);
    assert.equal(ChartModel.clamp(120), 100);
    assert.equal(ChartModel.clamp(65.4), 65.4);
    assert.equal(ChartModel.clamp(null), null);
    assert.equal(ChartModel.clamp(undefined), null);
    assert.equal(ChartModel.clamp(NaN), null);
});

test('computeSystemComparison correctly maps scores and flags missing data without fake zeros', () => {
    const inputRows = [
        {
            systemId: 'SYS001',
            name: 'System 1',
            status: 'good',
            effectivenessScore: 100,
            beforeScore: 80,
            afterScore: 100,
            satisfactionAverage: 4.5,
            combined: 93.75,
            lowSample: false,
            preliminary: false
        },
        {
            systemId: 'SYS018',
            name: 'System 18',
            status: 'watch',
            effectivenessScore: null,
            beforeScore: null,
            afterScore: null,
            satisfactionAverage: 3.2,
            combined: 55,
            lowSample: false,
            preliminary: false
        },
        {
            systemId: 'SYS019',
            name: 'System 19',
            status: 'no-data',
            effectivenessScore: null,
            beforeScore: null,
            afterScore: null,
            satisfactionAverage: null,
            combined: null,
            lowSample: false,
            preliminary: false
        }
    ];

    const model = ChartModel.computeSystemComparison(inputRows);
    assert.deepEqual(model.ticks, [0, 25, 50, 75, 100]);
    assert.equal(model.items.length, 3);

    // SYS001: both data present
    const s1 = model.items[0];
    assert.equal(s1.effectiveness.hasData, true);
    assert.equal(s1.effectiveness.afterWidth, 100);
    assert.equal(s1.effectiveness.beforeMark, 80);
    assert.equal(s1.satisfaction.hasData, true);
    // (4.5 - 1) / 4 * 100 = 87.5%
    assert.equal(s1.satisfaction.width, 87.5);
    assert.equal(s1.satisfaction.label, '4.50 / 5');

    // SYS018: satisfaction only, effectiveness has no data
    const s18 = model.items[1];
    assert.equal(s18.effectiveness.hasData, false);
    assert.equal(s18.effectiveness.afterScore, null);
    assert.equal(s18.effectiveness.label, null);
    assert.equal(s18.satisfaction.hasData, true);
    // (3.2 - 1) / 4 * 100 = 55%
    assert.equal(s18.satisfaction.width, 55);

    // SYS019: neither has data
    const s19 = model.items[2];
    assert.equal(s19.effectiveness.hasData, false);
    assert.equal(s19.satisfaction.hasData, false);
    assert.equal(s19.effectiveness.label, null);
    assert.equal(s19.satisfaction.label, null);
});

test('computeMetricComparison handles scored metrics and separates outside-criteria metrics', () => {
    const metrics = [
        {
            id: 'accept_time',
            definition: { direction: 'decrease', name: { th: 'เวลารับเรื่อง' }, unit: { th: 'ชั่วโมง' }, weight: 8 },
            scored: true,
            scoreBefore: 70,
            scoreAfter: 100,
            before: 22,
            after: 15.4,
            weight: 8
        },
        {
            id: 'custom_note',
            definition: null,
            scored: false,
            outsideCriteria: true,
            before: 10,
            after: 5
        }
    ];

    const model = ChartModel.computeMetricComparison(metrics);
    assert.equal(model.scored.length, 1);
    assert.equal(model.outsideCriteria.length, 1);

    const m1 = model.scored[0];
    assert.equal(m1.id, 'accept_time');
    assert.equal(m1.beforeWidth, 70);
    assert.equal(m1.afterWidth, 100);
    assert.equal(m1.beforeRaw, '22.00');
    assert.equal(m1.afterRaw, '15.40');

    const m2 = model.outsideCriteria[0];
    assert.equal(m2.id, 'custom_note');
    assert.equal(m2.outsideCriteria, true);
});

test('computeSatisfactionDistribution classifies into 5 bins matching standard scale and sums to 100%', () => {
    const records = [
        { average: 1.2 }, // level 1
        { average: 2.0 }, // level 2
        { average: 3.0 }, // level 3
        { average: 3.4 }, // level 3 (<= 3.40)
        { average: 3.5 }, // level 4
        { average: 4.5 }, // level 5
        { average: 5.0 }, // level 5
        { average: null } // invalid, ignored
    ];

    const model = ChartModel.computeSatisfactionDistribution(records);
    assert.equal(model.total, 7);
    assert.equal(model.hasData, true);

    const levels = model.levels;
    assert.equal(levels.length, 5);
    assert.equal(levels[0].count, 1); // 1.2
    assert.equal(levels[1].count, 1); // 2.0
    assert.equal(levels[2].count, 2); // 3.0, 3.4
    assert.equal(levels[3].count, 1); // 3.5
    assert.equal(levels[4].count, 2); // 4.5, 5.0

    const sumPercent = levels.reduce((sum, l) => sum + l.percent, 0);
    assert.ok(Math.abs(sumPercent - 100) < 0.001);
});

test('computeMonthlySatisfactionTrend groups by month and calculates average and height', () => {
    const records = [
        { submittedAt: '2026-05-10T10:00:00Z', satisfactionAnswers: [4, 5, 4, 5, 4] }, // avg 4.4
        { submittedAt: '2026-05-15T11:00:00Z', satisfactionAnswers: [5, 5, 5, 5, 5] }, // avg 5.0 -> May overall: 10 items, avg 4.7
        { submittedAt: '2026-06-01T09:00:00Z', satisfactionAnswers: [3, 3, 3, 3, 3] }  // avg 3.0 -> Jun: 5 items, avg 3.0
    ];

    const model = ChartModel.computeMonthlySatisfactionTrend(records);
    assert.equal(model.hasData, true);
    assert.equal(model.items.length, 2);

    assert.equal(model.items[0].month, '2026-05');
    assert.equal(model.items[0].average, 4.7);
    // (4.7 - 1) / 4 * 100 = 92.5%
    assert.equal(model.items[0].height, 92.5);

    assert.equal(model.items[1].month, '2026-06');
    assert.equal(model.items[1].average, 3.0);
    // (3.0 - 1) / 4 * 100 = 50%
    assert.equal(model.items[1].height, 50);
});
