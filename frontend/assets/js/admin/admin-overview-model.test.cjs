const test = require('node:test');
const assert = require('node:assert/strict');
const { compute } = require('./admin-overview-model.js');

test('overview counts real submissions and unique evaluators across both systems', () => {
    const systems = [{ id: 'SYS001' }, { id: 'SYS002' }];
    const quant = [
        { id: 'q1', userId: 'u1', systemId: 'SYS001', submittedAt: '2026-01-01' },
        { id: 'q-demo', userId: 'u2', systemId: 'SYS002', config: { isDemo: true }, submittedAt: '2026-01-03' }
    ];
    const satisfaction = [{ evaluatorId: 'u1', systemId: 'SYS001', submittedAt: '2026-01-02' }];
    const model = compute(systems, quant, satisfaction);
    assert.equal(model.realQuant.length, 1);
    assert.equal(model.evaluations.length, 1);
    assert.equal(model.evaluators.size, 1);
    assert.equal(model.excludedDemo, 1);
    assert.deepEqual(model.systems.map(system => system.id), ['SYS001', 'SYS002']);
    assert.equal(model.latestDate, '2026-01-02');
});

test('legacy quantitative records use profile.id for unique evaluator counts', () => {
    const model = compute([{ id: 'SYS001' }], [{ profile: { id: 'u1' }, systemId: 'SYS001' }], [{ evaluatorId: 'u1', systemId: 'SYS001' }]);
    assert.equal(model.evaluators.size, 1);
});

test('overview keeps every catalog system visible, including systems without data', () => {
    const model = compute([{ id: 'SYS001' }, { id: 'SYS002' }], [], [{ systemId: 'SYS002', evaluatorId: 'u1' }]);
    assert.deepEqual(model.systems.map(system => system.id), ['SYS001', 'SYS002']);
    assert.equal(model.quantBySystem.has('SYS002'), false);
    assert.equal(model.satisfactionBySystem.get('SYS002').length, 1);
    assert.equal(model.satisfactionBySystem.has('SYS001'), false);
});

test('overview counts marker-based mock submissions for the development banner', () => {
    const model = compute(
        [{ id: 'SYS001' }],
        [{ id: 'mock-quant-SYS001-90000001', userId: '90000001', systemId: 'SYS001' }],
        [{ id: 'mock-eval-SYS001-90000001', evaluatorId: '90000001', systemId: 'SYS001' }]
    );
    assert.equal(model.mockQuant.length, 1);
    assert.equal(model.mockEvaluations.length, 1);
    assert.equal(model.mockCount, 2);
});
