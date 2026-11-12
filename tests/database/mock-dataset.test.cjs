"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { generateMockDataset, generateMockSql, validateMockDataset, bandForSystem } = require("../../database/mock/generate-mock-data.cjs");
const bank = require("../../database/question-bank.json");

test("mock accounts and submissions are deterministic", () => {
  const first = generateMockDataset();
  const second = generateMockDataset();
  assert.deepEqual(first, second);
  assert.equal(generateMockSql(first), generateMockSql(second));
});

test("all systems have 15 paired effectiveness and satisfaction submissions", () => {
  const dataset = generateMockDataset();
  assert.equal(dataset.users.length, 315);
  assert.equal(dataset.evaluations.length, 630);
  assert.deepEqual(validateMockDataset(dataset), { valid: true, errors: [] });
  for (const system of bank.systems) {
    for (const type of ["effectiveness", "satisfaction"]) {
      assert.equal(dataset.evaluations.filter((row) => row.systemId === system.id && row.assessmentType === type).length, 15);
    }
  }
});

test("satisfaction mock answers include shared S1–S4 and each system's Specific item", () => {
  const dataset = generateMockDataset();
  for (const system of bank.systems) {
    for (const evaluation of dataset.evaluations.filter((row) => row.systemId === system.id && row.assessmentType === "satisfaction")) {
      const ids = new Set(evaluation.answers.map((answer) => answer.questionId));
      for (const id of ["S1", "S2", "S3", "S4", `${system.id}-SAT-SPEC-01`]) assert.ok(ids.has(id), `${evaluation.id} missing ${id}`);
    }
  }
});

test("mock responses follow visibility, role, contradiction, and N/A scoring rules", () => {
  const dataset = generateMockDataset();
  for (const evaluation of dataset.evaluations.filter((row) => row.assessmentType === "effectiveness")) {
    const ids = new Set(evaluation.answers.map((answer) => answer.questionId));
    const experience = evaluation.answers.find((answer) => answer.questionId === "history_experience").value;
    if (experience !== "used_old_system") {
      assert.equal([...ids].some((id) => id.startsWith("history_compare_")), false);
    }
    if (experience === "never_used") {
      assert.equal(ids.has("history_channels"), false);
    }
    const issues = evaluation.answers.find((answer) => answer.questionId === "issues_found").value;
    if (issues.includes("problem_9")) assert.deepEqual(issues, ["problem_9"]);
    for (const answer of evaluation.answers) {
      const question = bank.questions.find((item) => item.id === answer.questionId);
      if (question.roles.length) assert.ok(question.roles.includes(evaluation.respondentRoleLabel));
      if (answer.value === "na") assert.equal(answer.scoreValue, null);
      if (answer.questionId.startsWith("T")) assert.equal(bank.systems.find((item) => item.id === evaluation.systemId).has_tracking, true);
    }
  }
});

test("satisfaction ratings cover low, middle, and high system groups", () => {
  const dataset = generateMockDataset();
  for (const system of bank.systems) {
    const scores = dataset.evaluations
      .filter((row) => row.systemId === system.id && row.assessmentType === "satisfaction")
      .flatMap((row) => row.answers)
      .filter((answer) => ["S1", "S2", "S3", "S4", `${system.id}-SAT-SPEC-01`].includes(answer.questionId) && typeof answer.scoreValue === "number")
      .map((answer) => answer.scoreValue);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    if (bandForSystem(system.id) === "low") assert.ok(mean < 3, `${system.id}: ${mean}`);
    if (bandForSystem(system.id) === "middle") assert.ok(mean >= 3 && mean < 4, `${system.id}: ${mean}`);
    if (bandForSystem(system.id) === "high") assert.ok(mean >= 4, `${system.id}: ${mean}`);
  }
});
