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

test('the new dedupe migration deactivates only duplicate effectiveness rows and is one-time', () => {
    const backend = read('backend/src/main.cpp');
    assert.match(backend, /assessment_questions_dedupe_v2/);
    assert.match(backend, /UPDATE assessment_questions SET active=0 WHERE assessment_type='effectiveness'/);
    assert.match(backend, /sort_order BETWEEN 11 AND 21/);
    assert.match(backend, /id=system_id\|\|'-EFF-'\|\|printf\('%02d',sort_order\)/);
    assert.match(backend, /if\(!deduped\)/);
    assert.doesNotMatch(backend.slice(backend.indexOf("const char*dedupe"), backend.indexOf('return true;', backend.indexOf("const char*dedupe"))), /DELETE FROM (evaluations|assessment_answers|satisfactions)/);
});

test('new database seed has 10 effectiveness and 5 satisfaction questions per system', () => {
    const seed = read('database/questions_seed.sql');
    const counts = new Map();
    for (const match of seed.matchAll(/\('([^']+)','(SYS\d{3})','(effectiveness|satisfaction)'/g)) {
        const [, id, systemId, type] = match;
        const key = `${systemId}:${type}`;
        counts.set(key, [...(counts.get(key) || []), id]);
    }
    for (let i = 1; i <= 21; i++) {
        const systemId = `SYS${String(i).padStart(3, '0')}`;
        const effectiveness = counts.get(`${systemId}:effectiveness`) || [];
        const satisfaction = counts.get(`${systemId}:satisfaction`) || [];
        assert.equal(effectiveness.length, 10, `${systemId} effectiveness rows`);
        assert.equal(satisfaction.length, 5, `${systemId} satisfaction rows`);
        assert.ok(effectiveness.every((id, index) => id === `${systemId}-EFF-${String(index + 1).padStart(2, '0')}`));
    }
    assert.doesNotMatch(seed, /-EFF-(?:1[1-9]|2[01])'/);
});

test('admin cannot save default or cached questions for a system whose database load failed', () => {
    const systems = read('frontend/assets/js/core/systems-data.js');
    assert.match(systems, /databaseQuestionLoadState\.set\(systemId, "failed"\)/);
    assert.match(systems, /if \(databaseQuestionLoadState\.get\(systemId\) !== "loaded"\)/);
    assert.match(systems, /throw new Error\("บันทึกไม่ได้เพราะยังโหลดคำถามจากฐานข้อมูลไม่สำเร็จ/);
});
