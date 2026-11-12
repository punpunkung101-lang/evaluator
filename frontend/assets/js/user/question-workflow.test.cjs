const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('starting and continuing a survey enters the existing effectiveness before-after flow first', () => {
    const page = read('frontend/user/satisfaction/index.html');
    assert.match(page, /location\.replace\(effectivenessUrl\(requestedSystem\)\)/);
    assert.match(page, /window\.location\.href = effectivenessUrl\(selectedSystem\)/);
    assert.match(page, /evaluation\.html\?mode=before-after&system=/);
    assert.doesNotMatch(page, /location\.(?:href|replace)\s*=?.*satisfaction\.html/);

    const satisfaction = read('frontend/assets/js/user/satisfaction.js');
    assert.match(satisfaction, /if\s*\(selectedSystem && !requestedId\)/);
    assert.match(satisfaction, /getQuestions\(systemId, "effectiveness"\)/);
    assert.match(satisfaction, /evaluation\.html\?mode=before-after&system=/);
});

test('both assessment parts use active database question text without a hardcoded question fallback', () => {
    const effectiveness = read('frontend/assets/js/user/evaluation.js');
    const satisfaction = read('frontend/assets/js/user/satisfaction.js');
    assert.match(effectiveness, /getQuestions\(systemId, "effectiveness"\)/);
    assert.match(effectiveness, /databaseQuestions\.map\(question =>/);
    assert.match(effectiveness, /if \(!databaseQuestions\.length\)/);
    assert.doesNotMatch(effectiveness, /const defaultQuestions\s*=/);
    assert.match(satisfaction, /getQuestions\(systemId, "satisfaction"\)/);
    assert.match(satisfaction, /questionText\.textContent = questionTextFor\(questions\[currentIndex\]\)/);
});

test('the intro gets active question totals from the selected system and uses translated count placeholders', () => {
    const page = read('frontend/user/satisfaction/index.html');
    const language = read('frontend/assets/js/core/theme-lang.js');
    const api = read('frontend/assets/js/core/api.js');
    const systems = read('frontend/assets/js/core/systems-data.js');
    assert.match(page, /getQuestions\(systemId, "effectiveness"\)/);
    assert.match(page, /getQuestions\(systemId, "satisfaction"\)/);
    assert.match(page, /selectedQuestionCount/);
    assert.match(language, /survey_home_count: "ชุดคำถามที่เปิดใช้งานมีทั้งหมด \{count\} ข้อ"/);
    assert.match(language, /survey_home_count: "There are \{count\} active questions\."/);
    assert.match(api, /window\.API_CONFIG = API_CONFIG/);
    assert.doesNotMatch(systems, /http:\/\/localhost:8080/);
    assert.match(systems, /window\.API_CONFIG\?\.backendBaseUrl/);
});

test('backend startup rebuilds databases that do not match the versioned schema', () => {
    const backend = read('backend/src/main.cpp');
    assert.match(backend, /if \(userVersion != 2 \|\| !hasVersionedForms\)/);
    assert.match(backend, /DROP TABLE IF EXISTS evaluation_answers/);
    assert.match(backend, /DROP TABLE IF EXISTS form_versions/);
    assert.match(backend, /PRAGMA user_version=0/);
});

test('generated question seed includes every system-specific bank question and satisfaction item', () => {
    const seed = read('database/questions_seed.sql');
    const bank = JSON.parse(read('database/question-bank.json'));
    for (const system of bank.systems) {
        const specificEffectiveness = bank.questions.filter(q => q.system_id === system.id && q.assessment_type === 'effectiveness');
        const specificSatisfaction = bank.questions.filter(q => q.system_id === system.id && q.assessment_type === 'satisfaction');
        assert.ok(specificEffectiveness.length > 0, `${system.id} has effectiveness questions`);
        assert.equal(specificSatisfaction.length, 1, `${system.id} has one specific satisfaction item`);
        for (const question of [...specificEffectiveness, ...specificSatisfaction]) {
            assert.ok(seed.includes(`'${question.id}'`), `${question.id} appears in generated SQL`);
        }
    }
});

test('admin cannot save default or cached questions for a system whose database load failed', () => {
    const systems = read('frontend/assets/js/core/systems-data.js');
    assert.match(systems, /databaseQuestionLoadState\.set\(systemId, "failed"\)/);
    assert.match(systems, /if \(databaseQuestionLoadState\.get\(systemId\) !== "loaded"\)/);
    assert.match(systems, /throw new Error\("บันทึกไม่ได้เพราะยังโหลดคำถามจากฐานข้อมูลไม่สำเร็จ/);
});
