const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const tabs = require('./admin-tabs.js');

test('system results have four tabs and preserve both management destinations', () => {
    assert.deepEqual(tabs.tabs.map(tab => tab.id), ['summary', 'effectiveness', 'satisfaction', 'settings']);
    const source = fs.readFileSync(path.join(__dirname, 'admin-tabs.js'), 'utf8');
    assert.match(source, /admin\/manage\/assessment-management\.html/);
    assert.match(source, /admin\/manage\/processes\.html/);
    assert.match(source, /runtimeUrl\.fromScript/);
    assert.equal(typeof tabs.mount, 'function');
    const translations = fs.readFileSync(path.resolve(__dirname, '../core/theme-lang.js'), 'utf8');
    for (const key of [...tabs.tabs.map(tab => tab.key), 'admin_system_label', 'admin_system_choose', 'admin_system_all', 'admin_tabs_label', 'admin_assessment_settings', 'admin_process_settings']) {
        assert.equal((translations.match(new RegExp('\\b' + key + ':', 'g')) || []).length, 2, key + ' must have Thai and English text');
    }
});
