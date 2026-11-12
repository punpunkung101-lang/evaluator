#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const QUESTION_BANK_PATH = path.resolve(__dirname, "../question-bank.json");
const ANSWER_TYPES = new Set([
  "rating5", "dropdown", "radio", "checkbox", "short_text", "long_text",
  "number", "date", "yes_no", "ranking",
]);
const OPTION_TYPES = new Set(["dropdown", "radio", "checkbox", "ranking"]);

function validateQuestionBank(bank) {
  const errors = [];
  const questions = Array.isArray(bank?.questions) ? bank.questions : [];
  const systems = Array.isArray(bank?.systems) ? bank.systems : [];
  const optionSets = Array.isArray(bank?.option_sets) ? bank.option_sets : [];
  const ids = new Set();
  const systemIds = new Set(systems.map((system) => system.id));
  const optionSetIds = new Set(optionSets.map((set) => set.id));
  const questionById = new Map();

  if (!Array.isArray(bank?.questions)) errors.push("questions must be an array");
  if (!Array.isArray(bank?.systems) || systems.length !== 21) errors.push("systems must contain exactly 21 entries");
  if (!Array.isArray(bank?.option_sets)) errors.push("option_sets must be an array");
  if (optionSetIds.size !== optionSets.length) errors.push("option set ids must be unique");

  for (const system of systems) {
    if (!/^SYS\d{3}$/.test(system.id || "")) errors.push(`invalid system id: ${system.id}`);
    if (typeof system.has_tracking !== "boolean") errors.push(`${system.id}: has_tracking must be boolean`);
    if (!Array.isArray(system.roles) || !system.roles.length) errors.push(`${system.id}: roles must be a non-empty array`);
  }

  for (const set of optionSets) {
    if (!set.id || !Array.isArray(set.options) && !set.values_by_system && !set.values_by_role) {
      errors.push(`option set ${set.id || "<missing>"} must define options or a keyed option map`);
    }
    for (const [key, options] of Object.entries(set.values_by_system || {})) {
      if (!systemIds.has(key)) errors.push(`option set ${set.id}: values_by_system has unknown system ${key}`);
      if (!Array.isArray(options)) errors.push(`option set ${set.id}: values_by_system.${key} must be an array`);
    }
    for (const [key, options] of Object.entries(set.values_by_role || {})) {
      if (!Array.isArray(options)) errors.push(`option set ${set.id}: values_by_role.${key} must be an array`);
    }
    for (const option of [...(set.options || []), ...Object.values(set.values_by_system || {}).flat(), ...Object.values(set.values_by_role || {}).flat()]) {
      if (!option || typeof option.value !== "string" || typeof option.label !== "string") errors.push(`option set ${set.id}: each option needs string value and label`);
    }
  }

  for (const question of questions) {
    const label = question?.id || "<missing id>";
    if (!question?.id) errors.push("question is missing id");
    else if (ids.has(question.id)) errors.push(`duplicate question id: ${question.id}`);
    else { ids.add(question.id); questionById.set(question.id, question); }

    for (const field of ["text", "text_en", "answer_type", "options", "required", "is_scored", "indicator_group", "step", "section", "order", "roles", "visible_when", "allow_na", "allow_other", "max_select"]) {
      if (!(field in (question || {}))) errors.push(`${label}: missing ${field}`);
    }
    if (!ANSWER_TYPES.has(question?.answer_type)) errors.push(`${label}: unsupported answer_type ${question?.answer_type}`);
    if (!Array.isArray(question?.options)) errors.push(`${label}: options must be an array`);
    if (Array.isArray(question?.options)) {
      const optionValues = question.options.map((option) => option?.value);
      if (optionValues.some((value) => typeof value !== "string")) errors.push(`${label}: inline options need string values`);
      if (new Set(optionValues).size !== optionValues.length) errors.push(`${label}: inline option values must be unique`);
    }
    if (OPTION_TYPES.has(question?.answer_type)) {
      const hasInlineOptions = Array.isArray(question.options) && question.options.length > 0;
      const hasOptionSet = question.option_set_ref && optionSetIds.has(question.option_set_ref);
      if (!hasInlineOptions && !hasOptionSet) errors.push(`${label}: ${question.answer_type} requires options or a valid option_set_ref`);
    }
    if (question?.option_set_ref && !optionSetIds.has(question.option_set_ref)) errors.push(`${label}: unknown option set ${question.option_set_ref}`);
    if (!Number.isInteger(question?.step) || question.step < 1 || question.step > 4) errors.push(`${label}: step must be 1–4`);
    if (!Number.isInteger(question?.order) || question.order < 1) errors.push(`${label}: order must be a positive integer`);
    if (!Array.isArray(question?.roles)) errors.push(`${label}: roles must be an array`);
    if (question?.system_id != null && !systemIds.has(question.system_id)) errors.push(`${label}: unknown system ${question.system_id}`);
    if (question?.system_id != null && Array.isArray(question.roles)) {
      const system = systems.find((candidate) => candidate.id === question.system_id);
      for (const role of question.roles) if (system && !system.roles.includes(role)) errors.push(`${label}: role is not defined for ${question.system_id}`);
    }
    if (!["core", "specific"].includes(question?.indicator_group)) errors.push(`${label}: indicator_group must be core or specific`);
    if (question?.indicator_group === "core" && question.system_id != null) errors.push(`${label}: core question must not be tied to a system`);
    if (question?.indicator_group === "specific" && question.system_id == null) errors.push(`${label}: specific question must be tied to a system`);
    for (const flag of ["required", "is_scored", "allow_na", "allow_other"]) {
      if (typeof question?.[flag] !== "boolean") errors.push(`${label}: ${flag} must be boolean`);
    }
    if (question?.answer_type === "checkbox" && (!Number.isInteger(question.max_select) || question.max_select < 1)) errors.push(`${label}: checkbox requires positive max_select`);
    if (question?.answer_type !== "checkbox" && question?.max_select !== null) errors.push(`${label}: max_select must be null unless answer_type is checkbox`);
  }

  const graph = new Map([...questionById.keys()].map((id) => [id, new Set()]));
  for (const question of questions) {
    const label = question.id;
    const refs = [];
    collectQuestionReferences(question.visible_when, refs);
    collectQuestionReferences(question.depends_on, refs);
    for (const setId of [question.option_set_ref]) {
      const set = optionSets.find((candidate) => candidate.id === setId);
      collectQuestionReferences(set?.depends_on, refs);
    }
    for (const ref of refs) {
      if (!questionById.has(ref)) errors.push(`${label}: visible_when references missing question ${ref}`);
      else graph.get(label)?.add(ref);
    }
  }
  for (const question of questions) {
    for (const systemId of collectSystemIds(question.visible_when)) {
      if (!systemIds.has(systemId)) errors.push(`${question.id}: visible_when references missing system ${systemId}`);
    }
  }
  for (const cycle of findCycles(graph)) errors.push(`visible_when dependency cycle: ${cycle.join(" -> ")}`);

  for (const rule of bank?.answer_rules || []) {
    for (const id of rule.question_ids || []) if (!questionById.has(id)) errors.push(`answer rule ${rule.id}: unknown question ${id}`);
    const question = questionById.get((rule.question_ids || [])[0]);
    const values = new Set((question?.options || []).map((option) => option.value));
    for (const value of rule.exclusive_option_values || []) {
      if (!values.has(value)) errors.push(`answer rule ${rule.id}: unknown exclusive option value ${value}`);
    }
  }

  for (const question of questions) {
    if (question?.option_set_ref && !optionSetIds.has(question.option_set_ref)) continue;
    if (!question?.allow_other) continue;
    const set = optionSets.find((candidate) => candidate.id === question.option_set_ref);
    const options = [
      ...(question.options || []),
      ...(set?.options || []),
      ...Object.values(set?.values_by_system || {}).flat(),
      ...Object.values(set?.values_by_role || {}).flat(),
    ];
    if (!options.some((option) => option.allow_other || option.value === "other" || option.label === "อื่น ๆ")) {
      errors.push(`${question.id}: allow_other requires an “other” option`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function collectSystemIds(value, result = []) {
  if (!value || typeof value !== "object") return result;
  if (value.system && typeof value.system.id === "string") result.push(value.system.id);
  for (const child of Object.values(value)) collectSystemIds(child, result);
  return result;
}

function collectQuestionReferences(value, refs) {
  if (!value || typeof value !== "object") return;
  if (typeof value.question_id === "string") refs.push(value.question_id);
  for (const child of Object.values(value)) collectQuestionReferences(child, refs);
}

function findCycles(graph) {
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];
  const pathStack = [];
  function visit(id) {
    if (visiting.has(id)) {
      const start = pathStack.indexOf(id);
      cycles.push([...pathStack.slice(start), id]);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    pathStack.push(id);
    for (const next of graph.get(id) || []) visit(next);
    pathStack.pop();
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of graph.keys()) visit(id);
  return cycles;
}

if (require.main === module) {
  const bank = JSON.parse(fs.readFileSync(QUESTION_BANK_PATH, "utf8"));
  const result = validateQuestionBank(bank);
  if (!result.valid) {
    process.stderr.write(`${result.errors.map((error) => `- ${error}`).join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Question bank valid: ${bank.questions.length} questions, ${bank.systems.length} systems.\n`);
  }
}

module.exports = { validateQuestionBank, collectQuestionReferences, collectSystemIds, findCycles };
