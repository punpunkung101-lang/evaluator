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

test('satisfaction landing links to its own evaluation and counts satisfaction questions only', () => {
  const home = read('frontend/user/satisfaction/index.html');
  assert.match(home, /satisfactionUrl\(selectedSystem\)/);
  assert.match(home, /getQuestions\(systemId, "satisfaction"\)/);
  assert.doesNotMatch(home, /before-after|satisfaction\.js/);
});
