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
