const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('effectiveness and satisfaction pages use the same database-driven form renderer', () => {
  for (const page of ['frontend/user/effectiveness/evaluation.html', 'frontend/user/satisfaction/satisfaction.html']) {
    const html = read(page);
    assert.match(html, /id="assessment-form"/);
    assert.match(html, /assets\/js\/core\/conditional-engine\.js/);
    assert.match(html, /assets\/js\/user\/system-picker\.js/);
    assert.match(html, /assets\/js\/user\/assessment-form\.js/);
    assert.doesNotMatch(html, /quantitative\.js|evaluation\.js|satisfaction\.js/);
  }
});

test('one shared renderer supports the full answer type catalog, progress, review, drafts, and backend confirmation', () => {
  const renderer = read('frontend/assets/js/user/assessment-form.js');
  for (const type of ['rating5', 'dropdown', 'radio', 'checkbox', 'short_text', 'long_text', 'number', 'date', 'yes_no', 'ranking']) assert.match(renderer, new RegExp(type));
  assert.match(renderer, /formVersionId: versionId/);
  assert.match(renderer, /submitAnswers\(payload\)/);
  assert.match(renderer, /assessmentDraft:v1:/);
  assert.match(renderer, /ตรวจทานคำตอบ/);
  assert.match(renderer, /progress/);
});

test('question fields are selected by brief step, roles, and conditional visibility', () => {
  const renderer = read('frontend/assets/js/user/assessment-form.js');
  assert.match(renderer, /new Set\(questions\.map\(\(q\) => Number\(q\.step\)\)\)/);
  assert.match(renderer, /getVisibleQuestions\(questions, answers, context\(\)\)/);
  assert.match(renderer, /valuesByRole\?\.\[answers\.respondent_role\]/);
  assert.match(renderer, /optionSetRef/);
});

test('runtime form API reads systems and dependent option sets and posts the published form version', () => {
  const api = read('frontend/assets/js/core/api.js');
  assert.match(api, /getSystems\(\)/);
  assert.match(api, /getOptionSets\(systemId\)/);
  assert.match(api, /submitAnswers\(payload\)/);
  assert.match(api, /formVersionId/);
  assert.doesNotMatch(api, /beforeAnswers:|afterAnswers:|10 items/);
});

test('assessment entry pages render an authenticated API-backed system picker when no system is selected', () => {
  const renderer = read('frontend/assets/js/user/assessment-form.js');
  assert.match(renderer, /if \(!systemId\)/);
  assert.match(renderer, /AssessmentSystemPicker\.render/);
  assert.match(renderer, /getSystems\(\)/);
  assert.match(renderer, /returnTo/);
  assert.doesNotMatch(renderer, /location\.replace/);
  const picker = read('frontend/assets/js/user/system-picker.js');
  assert.match(picker, /data-assessment-type="effectiveness"/);
  assert.match(picker, /data-assessment-type="satisfaction"/);
  assert.match(picker, /system-search/);
});
