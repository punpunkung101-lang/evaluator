const test = require('node:test');
const assert = require('node:assert/strict');
const ChartModel = require('./chart-model.js');
const AdminCharts = require('./charts.js');

test('renderSystemComparison outputs accessible semantic HTML with grid ticks, legend and footnote', () => {
    const inputRows = [
        {
            systemId: 'SYS001',
            name: 'ระบบทดสอบ 01',
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
            systemId: 'SYS019',
            name: 'ระบบว่าง',
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
    const html = AdminCharts.renderSystemComparison(model);

    assert.ok(html.includes('role="img"'));
    assert.ok(html.includes('chart-ticks'));
    assert.ok(html.includes('style="left:0%"'));
    assert.ok(html.includes('style="left:100%"'));
    assert.ok(html.includes('results.html?system=SYS001'));
    assert.ok(html.includes('chart-mark before-mark'));
    assert.ok(html.includes('style="left:80%"'));
    // SYS019 has no data
    assert.ok(html.includes('chart-track empty'));
    // Footnote present
    assert.ok(html.includes('chart-criteria-footnote'));
});

test('renderMetricComparison renders scored metrics with hatched before and solid after bars, and separates outside criteria', () => {
    const metrics = [
        {
            id: 'm1',
            definition: { direction: 'decrease', name: { th: 'ตัวชี้วัด 1' }, unit: { th: 'ชม.' }, weight: 10 },
            scored: true,
            scoreBefore: 60,
            scoreAfter: 100,
            before: 20,
            after: 10,
            weight: 10
        },
        {
            id: 'm_out',
            definition: null,
            scored: false,
            outsideCriteria: true,
            before: 5,
            after: 3
        }
    ];

    const model = ChartModel.computeMetricComparison(metrics);
    const html = AdminCharts.renderMetricComparison(model);

    assert.ok(html.includes('role="img"'));
    assert.ok(html.includes('chart-fill before-hatched'));
    assert.ok(html.includes('chart-fill effectiveness'));
    assert.ok(html.includes('style="width:60%"'));
    assert.ok(html.includes('style="width:100%"'));
    assert.ok(html.includes('chart-outside-section'));
    assert.ok(html.includes('m_out'));
});

test('renderSatisfactionDistribution renders 100% stacked bar with 5 levels and legend', () => {
    const records = [
        { average: 1.5 },
        { average: 2.2 },
        { average: 3.0 },
        { average: 3.8 },
        { average: 4.8 }
    ];

    const model = ChartModel.computeSatisfactionDistribution(records);
    const html = AdminCharts.renderSatisfactionDistribution(model);

    assert.ok(html.includes('role="img"'));
    assert.ok(html.includes('chart-stack-bar'));
    assert.ok(html.includes('level-1'));
    assert.ok(html.includes('level-2'));
    assert.ok(html.includes('level-3'));
    assert.ok(html.includes('level-4'));
    assert.ok(html.includes('level-5'));
    assert.ok(html.includes('chart-stack-legend'));
});

test('renderMonthlySatisfactionTrend renders vertical column bars with months and average labels', () => {
    const records = [
        { submittedAt: '2026-05-10T10:00:00Z', satisfactionAnswers: [4, 4, 4, 4, 4] },
        { submittedAt: '2026-06-10T10:00:00Z', satisfactionAnswers: [5, 5, 5, 5, 5] }
    ];

    const model = ChartModel.computeMonthlySatisfactionTrend(records);
    const html = AdminCharts.renderMonthlySatisfactionTrend(model);

    assert.ok(html.includes('role="img"'));
    assert.ok(html.includes('chart-vertical-bars'));
    assert.ok(html.includes('2026-05'));
    assert.ok(html.includes('2026-06'));
    assert.ok(html.includes('chart-col-fill satisfaction'));
});
