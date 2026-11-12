const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeSystem, sideScore, satisfactionLevel, summarizeSatisfaction, summarizeEffectiveness, summarizeSatisfactionAssessment, buildImprovementSignals, THRESHOLDS } = require('./effectiveness-scoring.js');
const bank = require('../../../../database/question-bank.json');

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
    assert.equal(satisfactionLevel(4.51), 'very-high');
    assert.equal(satisfactionLevel(4.50), 'high');
    assert.equal(satisfactionLevel(3.51), 'high');
    assert.equal(satisfactionLevel(2.51), 'moderate');
    assert.equal(satisfactionLevel(1.51), 'low');
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
    assert.equal(result.level, 'high');
    assert.equal(result.lowSample, true);
});

function assessment(type, evaluatorId, answers, overrides = {}) {
    return {
        id: `${type}-${evaluatorId}`,
        systemId: overrides.systemId || 'SYS002',
        systemName: overrides.systemName || 'ระบบลาออนไลน์',
        assessmentType: type,
        evaluatorId,
        respondentRole: overrides.role || 'ROLE_A',
        respondentRoleLabel: overrides.roleLabel || 'ผู้ยื่นใบลา',
        submittedAt: overrides.submittedAt || '2026-11-01T10:00:00Z',
        answers
    };
}

function rating(questionId, value, isNa = false) {
    return { questionId, answerType: 'rating5', value, scoreValue: isNa ? null : value, isNa };
}

test('effectiveness averages only scored rating5 answers and returns n, N/A, role, and prior-use splits', () => {
    const questions = bank.questions.filter(question => question.assessment_type === 'effectiveness');
    const rows = [
        assessment('effectiveness', 'u1', [rating('U1', 5), rating('U2', 3), { questionId: 'FACT_E_REENTRY', answerType: 'number', value: 99, scoreValue: 99 }, { questionId: 'history_experience', value: 'used_old_system' }], { role: 'requester' }),
        assessment('effectiveness', 'u2', [rating('U1', 1), rating('U2', 3), { questionId: 'FACT_E_REENTRY', answerType: 'number', value: 1 }, { questionId: 'history_experience', value: 'never_used' }], { role: 'requester' }),
        assessment('effectiveness', 'u3', [rating('U1', 'na', true), rating('U2', 5), { questionId: 'FACT_E_REENTRY', answerType: 'number', value: 0 }, { questionId: 'history_experience', value: 'offline_only' }], { role: 'approver', roleLabel: 'ผู้อนุมัติ' })
    ];
    const result = summarizeEffectiveness(rows, questions, { minimumSample: 2 });
    assert.equal(result.n, 3);
    assert.equal(result.questionStats.U1.average, 3);
    assert.equal(result.questionStats.U1.n, 2);
    assert.equal(result.questionStats.U1.naCount, 1);
    assert.equal(result.questionStats.U2.average, 11 / 3);
    assert.equal(result.categoryStats.usability.average, 3.4);
    assert.equal(result.categoryStats.usability.n, 3);
    assert.equal(result.byRole.requester.n, 2);
    assert.equal(result.byPriorUse.used_old_system.n, 1);
    assert.equal(result.byPriorUse.never_used.n, 1);
    assert.equal(result.byPriorUse.offline_only.n, 1);
    assert.equal(result.ratingResponseCount, 5);
});

test('satisfaction separates S1–S4 from the system-specific rating and groups by role', () => {
    const questions = bank.questions.filter(question => question.assessment_type === 'satisfaction');
    const rows = [
        assessment('satisfaction', 'u1', [rating('S1', 4), rating('S2', 4), rating('S3', 3), rating('S4', 4), rating('SYS002-SAT-SPEC-01', 2)]),
        assessment('satisfaction', 'u2', [rating('S1', 5), rating('S2', 5), rating('S3', 5), rating('S4', 'na', true), rating('SYS002-SAT-SPEC-01', 4)], { role: 'approver', roleLabel: 'ผู้อนุมัติ' })
    ];
    const [result] = summarizeSatisfactionAssessment(rows, questions, { minimumSample: 1 });
    assert.equal(result.n, 2);
    assert.equal(result.average, 4.075);
    assert.equal(result.core.average, 4.375);
    assert.equal(result.core.naCount, 1);
    assert.equal(result.specific[0].average, 3);
    assert.equal(result.questionStats.S1.average, 4.5);
    assert.equal(Object.keys(result.byRole).length, 2);
});

function systemEvaluations(systemId, count, condition) {
    const rows = [];
    for (let index = 0; index < count; index += 1) {
        const low = condition === 'urgent';
        const review = condition === 'review';
        const effectAnswers = ['U1', 'E1', 'EF1', 'D1', 'T1', 'R1'].map(id => {
            const value = low ? 2 : review && id === 'U1' ? 2 : 5;
            return rating(id, value);
        });
        effectAnswers.push({ questionId: 'history_experience', value: index % 2 ? 'never_used' : 'used_old_system' });
        effectAnswers.push({ questionId: 'issues_found', answerType: 'checkbox', value: low ? ['problem_1', 'problem_2'] : ['problem_9'] });
        effectAnswers.push({ questionId: 'improvement_priorities', answerType: 'checkbox', value: low ? ['improve_2'] : [] });
        rows.push(assessment('effectiveness', `${systemId}-u${index}`, effectAnswers, { systemId }));
        const satValues = condition === 'urgent' ? [2, 2, 2, 2, 2] : condition === 'review' ? [4, 4, 4, 4, 4] : [5, 5, 5, 5, 5];
        rows.push(assessment('satisfaction', `${systemId}-u${index}`, ['S1', 'S2', 'S3', 'S4', `${systemId}-SAT-SPEC-01`].map((id, i) => rating(id, satValues[i])), { systemId }));
    }
    return rows;
}

test('multi-factor improvement signal covers insufficient, urgent, review, and strength outcomes', () => {
    const systems = [
        { id: 'SYS001', name: 'insufficient' },
        { id: 'SYS002', name: 'urgent' },
        { id: 'SYS003', name: 'review' },
        { id: 'SYS004', name: 'strength' }
    ];
    const evaluations = [
        ...systemEvaluations('SYS001', 8, 'strength'),
        ...systemEvaluations('SYS002', 12, 'urgent'),
        ...systemEvaluations('SYS003', 12, 'review'),
        ...systemEvaluations('SYS004', 12, 'strength')
    ];
    const signals = buildImprovementSignals(evaluations, bank.questions, systems);
    assert.deepEqual(signals.map(signal => signal.level), ['insufficient', 'urgent', 'review', 'strength']);
    assert.ok(signals[0].reasons.some(reason => reason.code === 'low-sample'));
    assert.ok(signals[1].reasons.some(reason => reason.code === 'low-satisfaction'));
    assert.ok(signals[2].reasons.some(reason => reason.code === 'low-categories'));
    assert.ok(signals[3].reasons.some(reason => reason.code === 'no-trigger'));
});

test('improvement sample and rating criteria can be changed through config', () => {
    const evaluations = systemEvaluations('SYS004', 12, 'strength');
    const [signal] = buildImprovementSignals(evaluations, bank.questions, [{ id: 'SYS004' }], { improvement: { minimumRespondents: 15 } });
    assert.equal(signal.level, 'insufficient');
});
