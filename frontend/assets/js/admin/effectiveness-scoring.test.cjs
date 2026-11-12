const test = require('node:test');
const assert = require('node:assert/strict');
const { satisfactionLevel, summarizeEffectiveness, summarizeSatisfactionAssessment, buildImprovementSignals } = require('./effectiveness-scoring.js');
const bank = require('../../../../database/question-bank.json');

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
