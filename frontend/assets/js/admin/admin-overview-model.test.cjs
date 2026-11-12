const test = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('./admin-overview-model.js');
const scoring = require('./effectiveness-scoring.js');

const systems = Array.from({ length: 21 }, (_, index) => ({ id: `SYS${String(index + 1).padStart(3, '0')}`, name: `System ${index + 1}` }));
const questions = [
    { id: 'e-core', system_id: null, assessment_type: 'effectiveness', indicator_group: 'core', answer_type: 'rating5', is_scored: true, section: 'usability', text: 'Ease' },
    { id: 's-core', system_id: null, assessment_type: 'satisfaction', indicator_group: 'core', answer_type: 'rating5', is_scored: true, text: 'S1' },
    { id: 's-specific', system_id: 'SYS001', assessment_type: 'satisfaction', indicator_group: 'specific', answer_type: 'rating5', is_scored: true, text: 'Specific' }
];

test('new overview preserves all 21 systems and derives effectiveness, satisfaction, and status from typed answers', () => {
    const evaluations = [
        { id: 'e-1', evaluatorId: 'user-1', systemId: 'SYS001', assessmentType: 'effectiveness', submittedAt: '2026-11-01', answers: [{ questionId: 'e-core', value: 4, scoreValue: 4 }] },
        { id: 's-1', evaluatorId: 'user-1', systemId: 'SYS001', assessmentType: 'satisfaction', submittedAt: '2026-11-02', answers: [{ questionId: 's-core', value: 5, scoreValue: 5 }, { questionId: 's-specific', value: 3, scoreValue: 3 }] }
    ];
    const model = compute(systems, evaluations, questions, scoring);
    assert.equal(model.systems.length, 21);
    assert.equal(model.systems[0].effectivenessAverage, 4);
    assert.equal(model.systems[0].satisfaction.average, 4);
    assert.equal(model.systems[0].signal.satisfactionN, 1);
    assert.equal(model.counts.insufficient, 21);
});

test('overview marks snapshot submissions as mock without calling them real', () => {
    const model = compute(systems, [{ id: 'mock-SYS001', isMock: true, evaluatorId: 'demo', systemId: 'SYS001', assessmentType: 'satisfaction', answers: [] }], questions, scoring);
    assert.equal(model.mockCount, 1);
    assert.equal(model.systems[0].mockCount, 1);
});

test('chart preparation safely handles no answers and empty problem selections', () => {
    const model = compute(systems, [], questions, scoring);
    const overview = require('./admin-overview-model.js').prepareOverviewCharts(model, [], questions, scoring.DEFAULT_SCORING_CONFIG.improvement);
    assert.equal(overview.bands.length, 21);
    assert.ok(overview.bands.every(row => row.low === 0 && row.middle === 0 && row.high === 0));
    const system = require('./admin-overview-model.js').prepareSystemCharts({ categoryStats: {} }, [], questions, scoring.DEFAULT_SCORING_CONFIG.improvement);
    assert.deepEqual(system.problems, []);
    assert.deepEqual(system.categories, []);
});

test('system chart preparation separates N/A and excludes it from score shares', () => {
    const qs = [{ id: 'u1', assessment_type: 'effectiveness', answer_type: 'rating5', is_scored: true, section: 'usability' }, { id: 'issues_found', assessment_type: 'effectiveness', answer_type: 'checkbox', is_scored: false, options: [] }];
    const records = [{ evaluatorId: 'r1', systemId: 'SYS001', assessmentType: 'effectiveness', answers: [{ questionId: 'u1', value: 1 }, { questionId: 'u1', value: 3 }, { questionId: 'u1', value: 5 }, { questionId: 'u1', value: 'na' }] }];
    const result = require('./admin-overview-model.js').prepareSystemCharts({ categoryStats: { usability: { section: 'usability', n: 1, average: 3 } } }, records, qs, {});
    assert.equal(result.low[0], 25);
    assert.equal(result.middle[0], 25);
    assert.equal(result.high[0], 25);
    assert.equal(result.na[0], 25);
    assert.deepEqual(result.problems, []);
});

test('all-N/A chart data has no valid-rating share and retains the N/A share', () => {
    const qs = [{ id: 'u1', assessment_type: 'effectiveness', answer_type: 'rating5', is_scored: true, section: 'usability' }];
    const records = [{ evaluatorId: 'r1', systemId: 'SYS001', assessmentType: 'effectiveness', answers: [{ questionId: 'u1', value: 'na' }] }];
    const result = require('./admin-overview-model.js').prepareSystemCharts({ categoryStats: { usability: { section: 'usability', n: 0, average: null } } }, records, qs, {});
    assert.deepEqual(result.low, [0]);
    assert.deepEqual(result.middle, [0]);
    assert.deepEqual(result.high, [0]);
    assert.deepEqual(result.na, [100]);
});

test('a system with no submissions stays null-valued and counts as insufficient', () => {
    const model = compute(systems, [], questions, scoring);
    const emptySystem = model.systems.find(item => item.system.id === 'SYS008');
    const charts = require('./admin-overview-model.js').prepareOverviewCharts(model, [], questions, scoring.DEFAULT_SCORING_CONFIG.improvement);
    assert.equal(emptySystem.effectiveness.n, 0);
    assert.equal(emptySystem.effectivenessAverage, null);
    assert.equal(emptySystem.satisfaction, null);
    assert.equal(emptySystem.signal.level, 'insufficient');
    assert.equal(model.counts.insufficient, 21);
    assert.equal(charts.averages.find(item => item.id === 'SYS008').effectiveness, null);
    assert.equal(charts.averages.find(item => item.id === 'SYS008').satisfaction, null);
});
