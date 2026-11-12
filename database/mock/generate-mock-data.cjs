#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const databaseDir = path.resolve(__dirname, "..");
const bank = JSON.parse(fs.readFileSync(path.join(databaseDir, "question-bank.json"), "utf8"));
const outputPath = path.join(__dirname, "mock-data.sql");
const FIXED_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
const FIXED_SALT = "0000000000000000000000000000000000000000000000000000000000000000";

const LOW = new Set(["SYS001", "SYS002", "SYS003", "SYS004"]);
const MIDDLE = new Set(["SYS005", "SYS006", "SYS007", "SYS008", "SYS009", "SYS010", "SYS011", "SYS012", "SYS013"]);
const BAND_SCORES = { low: [1, 2, 3, 2, 2], middle: [3, 4, 3, 4, 3], high: [4, 5, 4, 5, 4] };

function bandForSystem(systemId) {
  return LOW.has(systemId) ? "low" : MIDDLE.has(systemId) ? "middle" : "high";
}

function valuesForQuestion(question, system, roleValue) {
  if (question.id === "respondent_role") return system.role_option_values;
  if (Array.isArray(question.options) && question.options.length) return question.options;
  const set = bank.option_sets.find((item) => item.id === question.option_set_ref);
  if (!set) return [];
  if (set.values_by_system?.[system.id]) return set.values_by_system[system.id];
  if (set.values_by_role?.[roleValue]) return set.values_by_role[roleValue];
  return set.options || [];
}

function matchesVisibility(question, state) {
  const condition = question.visible_when || { all: [] };
  if (condition.system?.id && condition.system.id !== state.system.id) return false;
  if (condition.system?.has_tracking === true && !state.system.has_tracking) return false;
  for (const rule of condition.all || []) {
    const actual = state.answers.get(rule.question_id);
    if (rule.operator === "equals" && actual !== rule.value) return false;
    if (rule.operator === "in" && !(rule.value || []).includes(actual)) return false;
    if (rule.operator === "not_equals" && actual === rule.value) return false;
  }
  return true;
}

function submittedAt(systemIndex, respondent) {
  const month = 5 + ((systemIndex * 2 + respondent - 1) % 7);
  const day = 1 + ((systemIndex * 7 + respondent * 3) % 27);
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T09:00:00Z`;
}

function answerFor(question, state, respondent, systemIndex, questionIndex) {
  const scoreBand = BAND_SCORES[bandForSystem(state.system.id)];
  const choiceIndex = (systemIndex * 3 + respondent * 5 + questionIndex * 7) % 5;
  if (question.answer_type === "rating5") {
    const isNa = question.allow_na && (systemIndex + respondent * 3 + questionIndex * 5) % 17 === 0;
    if (isNa) return { value: "na", scoreValue: null, isNa: true };
    const value = scoreBand[choiceIndex];
    return { value, scoreValue: question.is_scored ? value : null, isNa: false };
  }

  const options = valuesForQuestion(question, state.system, state.roleValue);
  if (question.id === "history_experience") {
    const n = (systemIndex + respondent) % 10;
    return { value: n < 6 ? "used_old_system" : n < 8 ? "never_used" : "offline_only", scoreValue: null, isNa: false };
  }
  if (question.id === "issues_found") {
    if ((systemIndex + respondent) % 5 === 0) return { value: ["problem_9"], scoreValue: null, isNa: false };
    const available = options.filter((option) => option.value !== "problem_9" && option.value !== "other");
    return { value: [available[(respondent + systemIndex) % available.length].value, available[(respondent + systemIndex + 3) % available.length].value], scoreValue: null, isNa: false };
  }
  if (question.id === "respondent_role") return { value: state.roleValue, scoreValue: null, isNa: false };
  if (question.answer_type === "checkbox" || question.answer_type === "ranking") {
    const choices = options.filter((option) => option.value !== "other" && option.value !== "problem_9");
    const count = question.answer_type === "ranking" ? Math.min(3, choices.length) : Math.min(question.max_select || 2, 2, choices.length);
    const values = [];
    for (let index = 0; index < count; index += 1) values.push(choices[(respondent + systemIndex + questionIndex + index) % choices.length].value);
    if (question.id === "history_channels" || question.id === "history_limitations") values.splice(1);
    return { value: values, scoreValue: null, isNa: false };
  }
  if (question.answer_type === "yes_no") return { value: (respondent + systemIndex + questionIndex) % 4 === 0 ? "no" : "yes", scoreValue: null, isNa: false };
  if (question.answer_type === "number") return { value: (respondent + systemIndex + questionIndex) % 5, scoreValue: null, isNa: false };
  if (question.answer_type === "date") return { value: "2026-10-15", scoreValue: null, isNa: false };
  if (question.answer_type === "short_text" || question.answer_type === "long_text") return { value: `mock response ${state.system.id} ${String(respondent).padStart(2, "0")}`, scoreValue: null, isNa: false };
  if (!options.length) return { value: "not_applicable", scoreValue: null, isNa: false };
  const option = options[(respondent + systemIndex + questionIndex) % options.length];
  return { value: option.value, scoreValue: null, isNa: false };
}

function generateMockDataset() {
  const users = [];
  const evaluations = [];
  bank.systems.forEach((system, systemIndex) => {
    for (let respondent = 1; respondent <= 15; respondent += 1) {
      const suffix = String(respondent).padStart(2, "0");
      const user = {
        id: String(90000000 + systemIndex * 15 + respondent),
        username: `mock_${system.id}_${suffix}`,
        displayName: `Mock ${system.id.slice(-3)}-${suffix}`,
        role: ["student", "teacher", "staff"][(systemIndex + respondent - 1) % 3],
        passwordHash: FIXED_HASH,
        passwordSalt: FIXED_SALT,
        passwordIterations: 120000,
        createdAt: "2026-11-12T00:00:00Z",
      };
      users.push(user);
      const roleOption = system.role_option_values[(respondent - 1) % system.roles.length];
      for (const assessmentType of ["effectiveness", "satisfaction"]) {
        const state = { system, roleValue: roleOption.value, roleLabel: roleOption.label, answers: new Map() };
        const questions = bank.questions.filter((question) => question.assessment_type === assessmentType && (question.system_id == null || question.system_id === system.id));
        const answers = [];
        questions.forEach((question, questionIndex) => {
          if (question.roles.length && !question.roles.includes(state.roleLabel)) return;
          if (!matchesVisibility(question, state)) return;
          const generated = answerFor(question, state, respondent, systemIndex, questionIndex);
          state.answers.set(question.id, generated.value);
          answers.push({ questionId: question.id, questionText: question.text, answerType: question.answer_type, value: generated.value, scoreValue: generated.scoreValue, isNa: generated.isNa });
        });
        evaluations.push({
          id: `mock-eval-${system.id}-${assessmentType}-${suffix}`,
          systemId: system.id,
          systemName: system.name,
          assessmentType,
          formVersionId: `${system.id}-${assessmentType}-v1`,
          evaluatorId: user.id,
          respondentRole: roleOption.value,
          respondentRoleLabel: roleOption.label,
          profile: { respondentRole: roleOption.value },
          isMock: true,
          submittedAt: submittedAt(systemIndex, respondent),
          answers,
        });
      }
    }
  });
  return { users, evaluations };
}

function validateMockDataset(dataset) {
  const errors = [];
  if (dataset.users.length !== bank.systems.length * 15) errors.push("default mock must contain 15 accounts per system");
  const ids = new Set(dataset.evaluations.map((evaluation) => evaluation.id));
  if (ids.size !== dataset.evaluations.length) errors.push("mock evaluation IDs must be unique");
  for (const system of bank.systems) {
    for (const assessmentType of ["effectiveness", "satisfaction"]) {
      const matching = dataset.evaluations.filter((evaluation) => evaluation.systemId === system.id && evaluation.assessmentType === assessmentType);
      if (matching.length < 10 || matching.length > 20) errors.push(`${system.id}/${assessmentType} needs 10–20 submissions`);
    }
    const satisfaction = dataset.evaluations.filter((evaluation) => evaluation.systemId === system.id && evaluation.assessmentType === "satisfaction");
    const satisfactionQuestionIds = new Set(satisfaction.flatMap((evaluation) => evaluation.answers.map((answer) => answer.questionId)));
    for (const id of ["S1", "S2", "S3", "S4", `${system.id}-SAT-SPEC-01`]) if (!satisfactionQuestionIds.has(id)) errors.push(`${system.id}: mock satisfaction is missing ${id}`);
  }
  for (const evaluation of dataset.evaluations) {
    const questionIds = new Set(evaluation.answers.map((answer) => answer.questionId));
    if (questionIds.size !== evaluation.answers.length) errors.push(`${evaluation.id}: duplicate answers`);
    if (evaluation.assessmentType === "effectiveness") {
      const history = evaluation.answers.find((answer) => answer.questionId === "history_experience")?.value;
      const comparison = evaluation.answers.some((answer) => answer.questionId.startsWith("history_compare_"));
      if (history === "never_used" && comparison) errors.push(`${evaluation.id}: never-used respondent has comparison answers`);
      const issues = evaluation.answers.find((answer) => answer.questionId === "issues_found")?.value || [];
      if (issues.includes("problem_9") && issues.length > 1) errors.push(`${evaluation.id}: no-problem choice conflicts with other issues`);
    }
    for (const answer of evaluation.answers) {
      if (answer.answerType === "rating5" && answer.value === "na" && answer.scoreValue !== null) errors.push(`${evaluation.id}/${answer.questionId}: N/A must not be scored`);
      const question = bank.questions.find((item) => item.id === answer.questionId);
      if (question?.roles.length && !question.roles.includes(evaluation.respondentRoleLabel)) errors.push(`${evaluation.id}: answered question outside respondent role`);
    }
  }
  return { valid: errors.length === 0, errors };
}

const sql = (value) => `'${String(value ?? "").replaceAll("'", "''")}'`;
const json = (value) => sql(JSON.stringify(value));

function generateMockSql(dataset = generateMockDataset()) {
  const validation = validateMockDataset(dataset);
  if (!validation.valid) throw new Error(validation.errors.join("\n"));
  const lines = [
    "-- Deterministic generated mock records. Synthetic data only; not system operational data.",
    "PRAGMA foreign_keys = ON;",
    "BEGIN IMMEDIATE;",
    "DELETE FROM evaluations WHERE is_mock = 1;",
    "DELETE FROM users WHERE substr(username,1,5) = 'mock_';",
  ];
  for (const user of dataset.users) {
    lines.push(`INSERT INTO users(id,username,display_name,role,password_hash,password_salt,password_iterations,created_at) VALUES(${[user.id,user.username,user.displayName,user.role,user.passwordHash,user.passwordSalt,user.passwordIterations,user.createdAt].map(sql).join(",")});`);
  }
  for (const evaluation of dataset.evaluations) {
    lines.push(`INSERT INTO evaluations(id,system_id,system_name,assessment_type,form_version_id,evaluator_id,respondent_role,respondent_role_label,profile_json,is_mock,submitted_at) VALUES(${[evaluation.id,evaluation.systemId,evaluation.systemName,evaluation.assessmentType,evaluation.formVersionId,evaluation.evaluatorId,evaluation.respondentRole,evaluation.respondentRoleLabel].map(sql).join(",")},${json(evaluation.profile)},1,${sql(evaluation.submittedAt)});`);
    for (const answer of evaluation.answers) {
      lines.push(`INSERT INTO evaluation_answers(evaluation_id,question_id,question_text,answer_type,answer_json,score_value,is_na) VALUES(${[evaluation.id,answer.questionId,answer.questionText,answer.answerType].map(sql).join(",")},${json(answer.value)},${answer.scoreValue == null ? "NULL" : answer.scoreValue},${answer.isNa ? 1 : 0});`);
    }
  }
  lines.push("COMMIT;", "");
  return lines.join("\n");
}

if (require.main === module) {
  const dataset = generateMockDataset();
  fs.writeFileSync(outputPath, generateMockSql(dataset), "utf8");
  process.stdout.write(`Generated ${dataset.users.length} mock accounts and ${dataset.evaluations.length} submissions across 21 systems.\n`);
}

module.exports = { generateMockDataset, generateMockSql, validateMockDataset, bandForSystem };
