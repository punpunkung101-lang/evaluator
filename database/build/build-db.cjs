#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const databaseDir = path.resolve(__dirname, "..");
const repositoryRoot = path.resolve(databaseDir, "..");
const DEFAULT_OUTPUT = path.join(databaseDir, "evaluator.db");
const SOURCE_FILES = [
  "schema.sql",
  "seed.sql",
  "questions_seed.sql",
  path.join("mock", "mock-data.sql"),
];

function removeSidecars(filePath) {
  for (const suffix of ["-journal", "-wal", "-shm"]) {
    const sidecar = `${filePath}${suffix}`;
    if (fs.existsSync(sidecar)) fs.rmSync(sidecar, { force: true });
  }
}

function readSource(relativePath) {
  const filePath = path.join(databaseDir, relativePath);
  if (!fs.existsSync(filePath)) throw new Error(`Missing database source file: ${relativePath}`);
  return fs.readFileSync(filePath, "utf8");
}

function inspectDatabase(db) {
  const integrity = db.prepare("PRAGMA integrity_check").all();
  const foreignKeys = db.prepare("PRAGMA foreign_key_check").all();
  const sessions = db.prepare("SELECT COUNT(*) AS count FROM auth_sessions").get().count;
  const counts = {};
  for (const table of ["users", "systems", "assessment_forms", "form_versions", "assessment_questions", "form_version_questions", "option_sets", "evaluations", "evaluation_answers", "auth_sessions", "app_settings"]) {
    counts[table] = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  }
  return { integrity, foreignKeys, sessions, counts };
}

function assertDatabaseHealth(result) {
  if (result.integrity.length !== 1 || result.integrity[0].integrity_check !== "ok") throw new Error(`SQLite integrity_check failed: ${JSON.stringify(result.integrity)}`);
  if (result.foreignKeys.length) throw new Error(`SQLite foreign_key_check failed: ${JSON.stringify(result.foreignKeys.slice(0, 10))}`);
  if (result.sessions !== 0) throw new Error(`auth_sessions must be empty in the built baseline; found ${result.sessions}`);
  if (result.counts.users !== 316) throw new Error(`Expected 316 users (Admin + 315 mock), found ${result.counts.users}`);
  if (result.counts.systems !== 21 || result.counts.assessment_forms !== 42 || result.counts.form_versions !== 42) throw new Error("Expected 21 systems and 42 active forms/form versions");
  if (result.counts.assessment_questions !== 189) throw new Error(`Expected 189 bank questions, found ${result.counts.assessment_questions}`);
  if (result.counts.evaluations !== 630) throw new Error(`Expected 630 mock submissions, found ${result.counts.evaluations}`);
  if (result.counts.form_version_questions !== 1349) throw new Error(`Expected 1,349 form-question links, found ${result.counts.form_version_questions}`);
  if (result.counts.option_sets !== 37) throw new Error(`Expected 37 question-bank option sets, found ${result.counts.option_sets}`);
  if (result.counts.app_settings !== 1) throw new Error(`Expected one default improvement-scoring setting, found ${result.counts.app_settings}`);
  if (result.counts.evaluation_answers !== 18759) throw new Error(`Expected 18,759 typed answers, found ${result.counts.evaluation_answers}`);
}

function buildDatabase(outputPath = DEFAULT_OUTPUT) {
  const absoluteOutput = path.resolve(outputPath);
  const temporaryOutput = `${absoluteOutput}.building`;
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  if (fs.existsSync(temporaryOutput)) fs.rmSync(temporaryOutput, { force: true });
  removeSidecars(temporaryOutput);

  let db;
  try {
    db = new DatabaseSync(temporaryOutput);
    for (const relativePath of SOURCE_FILES) db.exec(readSource(relativePath));
    db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = DELETE;");
    const result = inspectDatabase(db);
    assertDatabaseHealth(result);
    db.exec("VACUUM;");
    db.close();
    db = null;
    removeSidecars(temporaryOutput);
    if (fs.existsSync(absoluteOutput)) fs.rmSync(absoluteOutput, { force: true });
    removeSidecars(absoluteOutput);
    fs.renameSync(temporaryOutput, absoluteOutput);
    return { outputPath: absoluteOutput, ...result };
  } catch (error) {
    if (db) db.close();
    removeSidecars(temporaryOutput);
    if (fs.existsSync(temporaryOutput)) fs.rmSync(temporaryOutput, { force: true });
    throw error;
  }
}

if (require.main === module) {
  try {
    const result = buildDatabase();
    process.stdout.write(`Built ${result.outputPath}\n`);
    process.stdout.write(`${JSON.stringify(result.counts)}\n`);
    process.stdout.write("integrity_check=ok; foreign_key_check=empty; auth_sessions=0\n");
  } catch (error) {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { buildDatabase, inspectDatabase, assertDatabaseHealth, DEFAULT_OUTPUT, repositoryRoot };
