const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('./conditional-engine.js');

const questions = [
  { id: 'prior', answer_type: 'radio', required: true, options: [{ value: 'yes' }, { value: 'no' }] },
  { id: 'old', answer_type: 'number', required: true, visible_when: { question_id: 'prior', operator: 'equals', value: 'yes' } },
  { id: 'admin_only', answer_type: 'short_text', roles: ['ผู้ดูแล'], required: true },
  { id: 'issues', answer_type: 'checkbox', options: [{ value: 'none' }, { value: 'slow' }], max_select: 2 }
];

test('conditions support answer and system predicates and nested all/any', () => {
  const ctx = { system: { id: 'SYS001', has_tracking: false } };
  assert.equal(engine.evaluateCondition({ all: [
    { question_id: 'prior', value: 'yes' },
    { system: { id: 'SYS001', has_tracking: false } },
    { any: [{ question_id: 'unused', operator: 'is_answered', value: false }, { question_id: 'prior', operator: 'in', value: ['yes'] }] }
  ] }, { prior: 'yes' }, ctx), true);
});

test('visible question list respects conditional answers and respondent role', () => {
  const visible = engine.getVisibleQuestions(questions, { prior: 'no' }, { respondentRole: 'ผู้ใช้' });
  assert.deepEqual(visible.map((q) => q.id), ['prior', 'issues']);
});

test('required validation applies only to visible questions', () => {
  const result = engine.validateAnswers({ questions, answers: { prior: 'no' }, context: { respondentRole: 'ผู้ใช้' } });
  assert.equal(result.valid, true);
});

test('required, type, max selection, and exclusive-choice errors are returned', () => {
  const result = engine.validateAnswers({
    questions,
    answers: { prior: 'yes', old: 99, issues: ['none', 'slow'] },
    context: { respondentRole: 'ผู้ดูแล' },
    answerRules: [{ type: 'mutually_exclusive', question_ids: ['issues'], exclusive_option_values: ['none'] }]
  });
  assert.deepEqual(result.errors.map((e) => e.code), ['required', 'mutually_exclusive']);
  assert.equal(result.errors[1].questionId, 'issues');
});

test('choice values outside the question options are rejected', () => {
  const result = engine.validateAnswers({ questions, answers: { prior: 'maybe' }, context: { respondentRole: 'ผู้ใช้' } });
  assert.equal(result.errors.some((e) => e.code === 'invalid_option'), true);
});

test('exclusive options remain mutually exclusive when no separate rule payload is supplied', () => {
  const question = { id: 'issues_found', answer_type: 'checkbox', options: [{ value: 'problem_9', exclusive: true }, { value: 'slow' }] };
  const result = engine.validateAnswers({ questions: [question], answers: { issues_found: ['problem_9', 'slow'] } });
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].code, 'mutually_exclusive');
});
