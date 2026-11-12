"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { buildDatabase } = require("../../database/build/build-db.cjs");
const { generateQuestionsSeed } = require("../../database/build/generate-questions-seed.cjs");
const { generateMockSql } = require("../../database/mock/generate-mock-data.cjs");

test("generated question and mock SQL match the committed text sources", () => {
  const root = path.resolve(__dirname, "../..");
  assert.equal(generateQuestionsSeed(), fs.readFileSync(path.join(root, "database/questions_seed.sql"), "utf8"));
  assert.equal(generateMockSql(), fs.readFileSync(path.join(root, "database/mock/mock-data.sql"), "utf8"));
});

test("database build is deterministic and round-trips all sources with healthy constraints", (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "evaluator-db-build-"));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const one = path.join(temp, "one.db");
  const two = path.join(temp, "two.db");
  buildDatabase(one);
  buildDatabase(two);
  const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  assert.equal(hash(one), hash(two), "rebuilding from the same text sources must produce identical SQLite bytes");

  const db = new DatabaseSync(one, { readOnly: true });
  try {
    assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM auth_sessions").get().n, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM systems").get().n, 21);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM assessment_forms").get().n, 42);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM form_versions").get().n, 42);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM assessment_questions").get().n, 189);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM form_version_questions").get().n, 1349);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM option_sets").get().n, 37);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM app_settings WHERE setting_key='improvement_scoring'").get().n, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE substr(username,1,5)='mock_'").get().n, 315);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM evaluations WHERE is_mock=1").get().n, 630);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM evaluation_answers").get().n, 18759);

    const perType = db.prepare("SELECT system_id,assessment_type,COUNT(*) AS n FROM evaluations GROUP BY system_id,assessment_type ORDER BY system_id,assessment_type").all();
    assert.equal(perType.length, 42);
    assert.ok(perType.every((row) => row.n === 15));
    const unmatchedVersions = db.prepare("SELECT COUNT(*) AS n FROM evaluations e JOIN form_versions v ON v.id=e.form_version_id JOIN assessment_forms f ON f.id=v.form_id WHERE e.system_id<>f.system_id OR e.assessment_type<>f.assessment_type").get().n;
    assert.equal(unmatchedVersions, 0);
    const satisfactionCoverage = db.prepare("SELECT e.system_id,COUNT(DISTINCT e.evaluator_id) AS respondents,COUNT(DISTINCT a.question_id) AS questions FROM evaluations e JOIN evaluation_answers a ON a.evaluation_id=e.id WHERE e.assessment_type='satisfaction' GROUP BY e.system_id").all();
    assert.equal(satisfactionCoverage.length, 21);
    assert.ok(satisfactionCoverage.every((row) => row.respondents === 15 && row.questions === 5));
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM evaluations WHERE is_mock=0").get().n, 0);
  } finally {
    db.close();
  }
});
