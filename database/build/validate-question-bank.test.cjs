"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { validateQuestionBank } = require("./validate-question-bank.cjs");

const bankPath = path.resolve(__dirname, "../question-bank.json");
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

test("question bank validates and covers the required systems and satisfaction sets", () => {
  const result = validateQuestionBank(bank);
  assert.deepEqual(result.errors, []);
  assert.equal(bank.systems.length, 21);
  assert.equal(bank.questions.filter((question) => question.id === "S1").length, 1);
  for (const system of bank.systems) {
    assert.equal(bank.questions.filter((question) => question.system_id === system.id && question.assessment_type === "satisfaction").length, 1);
    assert.ok(bank.questions.some((question) => question.system_id === system.id && question.assessment_type === "effectiveness"));
    if (system.id !== "SYS018") {
      assert.ok(bank.questions.filter((question) => question.system_id === system.id && question.assessment_type === "effectiveness").length >= 3);
    }
  }
});

test("shared Core is stored once and tracking questions are conditional by system", () => {
  for (const id of ["U1", "E1", "EF1", "D1", "T1", "R1", "S1", "S2", "S3", "S4"]) {
    assert.equal(bank.questions.filter((question) => question.id === id).length, 1, `${id} should be defined once`);
  }
  const tracking = bank.questions.filter((question) => /^T[1-5]$/.test(question.id));
  assert.equal(tracking.length, 5);
  assert.ok(tracking.every((question) => question.visible_when.system?.has_tracking === true));
  assert.equal(bank.systems.filter((system) => !system.has_tracking).length > 0, true);
});

test("SYS018-specific profile choices include the three paths and all eight workflow states", () => {
  const byId = new Map(bank.option_sets.map((set) => [set.id, set]));
  assert.equal(byId.get("sys018_work_categories").options.length, 6);
  assert.deepEqual(byId.get("sys018_work_paths").options.map((option) => option.value), ["path_a", "path_b", "path_c"]);
  assert.equal(byId.get("sys018_work_statuses").options.length, 8);
  assert.equal(bank.questions.filter((question) => question.id.startsWith("ROLE_")).length, 24);
  assert.ok(bank.questions.filter((question) => question.depends_on?.question_id === "respondent_role").length >= 6);
  const rolesBySystem = byId.get("roles_by_system").values_by_system;
  assert.equal(Object.keys(rolesBySystem).length, 21);
  for (const system of bank.systems) assert.deepEqual(rolesBySystem[system.id].map((option) => option.label), system.roles.concat("อื่น ๆ"));
});

test("problem answer rule marks the no-problem choice as exclusive", () => {
  const issue = bank.questions.find((question) => question.id === "issues_found");
  assert.equal(issue.options.find((option) => option.value === "problem_9").exclusive, true);
  assert.deepEqual(bank.answer_rules[0].exclusive_option_values, ["problem_9"]);
});

test("validator rejects duplicate question IDs and unsupported answer types", () => {
  const invalid = clone(bank);
  invalid.questions[1].id = invalid.questions[0].id;
  invalid.questions[2].answer_type = "likert5";
  const result = validateQuestionBank(invalid);
  assert.ok(result.errors.some((error) => error.includes("duplicate question id")));
  assert.ok(result.errors.some((error) => error.includes("unsupported answer_type")));
});

test("validator rejects missing visibility references and dependency cycles", () => {
  const missing = clone(bank);
  missing.questions[0].visible_when = { all: [{ question_id: "does_not_exist", operator: "equals", value: "x" }] };
  assert.ok(validateQuestionBank(missing).errors.some((error) => error.includes("references missing question")));

  const cyclic = clone(bank);
  cyclic.questions[0].visible_when = { all: [{ question_id: cyclic.questions[1].id, operator: "equals", value: "x" }] };
  cyclic.questions[1].depends_on = { question_id: cyclic.questions[0].id };
  assert.ok(validateQuestionBank(cyclic).errors.some((error) => error.includes("dependency cycle")));
});

test("validator requires valid options for choice question types", () => {
  const invalid = clone(bank);
  const question = invalid.questions.find((item) => item.answer_type === "dropdown");
  question.options = [];
  question.option_set_ref = "missing_set";
  const result = validateQuestionBank(invalid);
  assert.ok(result.errors.some((error) => error.includes("requires options or a valid option_set_ref")));
});
