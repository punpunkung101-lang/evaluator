const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const NAV = require('./nav-config.js');

const root = path.resolve(__dirname, '../../../..');

test('admin sidebar has the two shared dashboard destinations', () => {
    assert.deepEqual(NAV.sidebar.admin.map(item => [item.labelKey, item.href]), [
        ['nav_overview', 'admin/dashboard.html#overview'],
        ['nav_systems', 'admin/dashboard.html#systems']
    ]);
    assert.strictEqual(NAV.header.admin[1], NAV.sidebar.admin[0]);
    assert.strictEqual(NAV.header.admin[2], NAV.sidebar.admin[1]);
});

test('active matchers cover portal, assessment, admin dashboard and child pages', () => {
    const match = (pathname, hash, items) => NAV.activeItem(items, { pathname, hash })?.id || null;
    assert.equal(match('/frontend/user/index.html', '', NAV.header.guest), 'home');
    assert.equal(match('/frontend/user/effectiveness/evaluation.html', '', NAV.header.user), 'effectiveness');
    assert.equal(match('/frontend/user/satisfaction/evaluation.html', '', NAV.header.user), 'satisfaction');
    assert.equal(match('/frontend/admin/dashboard.html', '#overview', NAV.sidebar.admin), 'overview');
    assert.equal(match('/admin/dashboard.html', '#systems', NAV.sidebar.admin), 'results');
    assert.equal(match('/admin/dashboard.html', '#quantitative-results', NAV.sidebar.admin), 'results');
    assert.equal(match('/admin/dashboard.html', '#satisfaction', NAV.sidebar.admin), 'results');
    assert.equal(match('/frontend/admin/evaluation-detail.html', '', NAV.sidebar.admin), 'results');
    assert.equal(match('/frontend/admin/manage/assessment-management.html', '', NAV.sidebar.admin), 'overview');
    assert.equal(match('/frontend/admin/manage/processes.html', '', NAV.sidebar.admin), 'overview');
});

test('each role menu and the shared sidebar avoid duplicate destinations', () => {
    for (const items of [...Object.values(NAV.header), NAV.sidebar.admin]) {
        const destinations = items.map(item => item.href).filter(Boolean);
        assert.equal(new Set(destinations).size, destinations.length);
    }
    assert.deepEqual(NAV.header.admin.map(item => item.id), ['home', 'overview', 'results']);
});

test('every navigation label key has Thai and English entries in theme-lang', () => {
    const source = fs.readFileSync(path.join(root, 'frontend/assets/js/core/theme-lang.js'), 'utf8');
    for (const key of NAV.labelKeys) {
        const definitions = source.match(new RegExp(`\\b${key}:`, 'g')) || [];
        assert.equal(definitions.length, 2, `${key} must be defined in both language dictionaries`);
    }
});
