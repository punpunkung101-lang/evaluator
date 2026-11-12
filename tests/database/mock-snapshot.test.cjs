'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const { SKIP_SYSTEMS } = require('../../database/mock/generate-mock-data.cjs');
const root = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(root, 'database/evaluator.db'), { readOnly: true });
const source = fs.readFileSync(path.join(root, 'frontend/assets/data/mock-snapshot.js'), 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(source, context);
const snapshot = JSON.parse(JSON.stringify(context.window.EvaluatorMockSnapshot));

test('demo snapshot is the same typed systems, published questions, and mock evaluations as SQLite', () => {
    const systems = JSON.parse(JSON.stringify(db.prepare('SELECT id,name,name_en FROM systems WHERE active=1 ORDER BY sort_order,id').all()));
    assert.deepEqual(snapshot.systems.map(({ id, name, name_en }) => ({ id, name, name_en })), systems);
    const mockEvaluations = db.prepare('SELECT id,system_id,assessment_type,form_version_id,evaluator_id,respondent_role,respondent_role_label,submitted_at FROM evaluations WHERE is_mock=1 ORDER BY submitted_at DESC,id').all();
    assert.equal(snapshot.evaluations.length, mockEvaluations.length);
    for (const evaluation of snapshot.evaluations) {
        assert.ok(snapshot.questions[evaluation.systemId]);
        assert.ok(['effectiveness', 'satisfaction'].includes(evaluation.assessmentType));
        assert.ok(evaluation.answers.every(answer => answer.questionId && answer.answerType));
    }
    const respondingSystems = snapshot.systems.filter(system => !SKIP_SYSTEMS.includes(system.id)).length;
    assert.equal(snapshot.evaluations.filter(row => row.assessmentType === 'satisfaction').length, respondingSystems * 15);
    assert.equal(snapshot.evaluations.filter(row => row.assessmentType === 'effectiveness').length, respondingSystems * 15);
    for (const systemId of SKIP_SYSTEMS) assert.equal(snapshot.evaluations.filter(row => row.systemId === systemId).length, 0);
});

test('every system has S1-S4 and its specific satisfaction question in the demo payload', () => {
    for (const system of snapshot.systems) {
        const questions = snapshot.questions[system.id].filter(q => q.assessment_type === 'satisfaction');
        assert.deepEqual(questions.filter(q => q.indicator_group === 'core').map(q => q.id), ['S1', 'S2', 'S3', 'S4']);
        assert.equal(questions.filter(q => q.indicator_group === 'specific' && q.system_id === system.id).length, 1);
    }
});

test('skipped SYS008 keeps its system and questions but has no mock responses or answers', () => {
    assert.ok(snapshot.systems.some(system => system.id === 'SYS008'));
    assert.ok(snapshot.questions.SYS008.some(question => question.assessment_type === 'effectiveness'));
    assert.ok(snapshot.questions.SYS008.some(question => question.assessment_type === 'satisfaction'));
    assert.equal(snapshot.evaluations.filter(row => row.systemId === 'SYS008').length, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM evaluations WHERE system_id='SYS008'").get().count, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM evaluation_answers a JOIN evaluations e ON e.id=a.evaluation_id WHERE e.system_id='SYS008'").get().count, 0);
});

test('Admin scoring settings are exported from the same database used by the backend', () => {
    const settings = JSON.parse(db.prepare("SELECT value_json FROM app_settings WHERE setting_key='improvement_scoring'").get().value_json);
    assert.deepEqual(snapshot.settings.improvement, settings);
});

test('Admin option sets in the demo snapshot match the database source', () => {
    const rows = db.prepare('SELECT id,system_id AS systemId,options_json,values_by_system_json,values_by_role_json,depends_on_json FROM option_sets ORDER BY id').all().map(row => ({ id: row.id, systemId: row.systemId, options: JSON.parse(row.options_json), valuesBySystem: JSON.parse(row.values_by_system_json), valuesByRole: JSON.parse(row.values_by_role_json), dependsOn: JSON.parse(row.depends_on_json) }));
    assert.deepEqual(snapshot.optionSets, rows);
});

test.after(() => db.close());


