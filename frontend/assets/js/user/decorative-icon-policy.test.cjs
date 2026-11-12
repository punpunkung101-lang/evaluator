'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const scannedFiles = [
    'frontend/assets/js/user/app.js',
    'frontend/assets/js/user/assessment-form.js',
    'frontend/assets/js/user/system-picker.js',
    'frontend/assets/js/admin/question-admin.js',
    'frontend/assets/js/core/theme-lang.js',
    'frontend/assets/js/layout/site-header.js',
    'frontend/user/index.html',
    'frontend/user/effectiveness/evaluation.html',
    'frontend/user/satisfaction/satisfaction.html'
];
const allowedUnicode = new Map([['☾', /theme|toggle/i], ['☀', /theme|toggle/i], ['✓', /is-selected|summary-check/]]);
const decorativeUnicode = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F\u2B50\u2139]/u;

test('active user and admin flows avoid decorative Unicode icons', () => {
    const violations = [];
    for (const file of scannedFiles) {
        const source = fs.readFileSync(path.join(root, file), 'utf8');
        for (const [index, line] of source.split(/\r?\n/).entries()) for (const character of line) {
            if (!decorativeUnicode.test(character)) continue;
            if (!allowedUnicode.get(character)?.test(line)) violations.push(`${file}:${index + 1} ${character}`);
        }
    }
    assert.deepEqual(violations, []);
});
