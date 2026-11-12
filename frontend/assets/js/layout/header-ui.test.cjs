const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../..');
const sharedHeaderPages = [
    'frontend/user/index.html',
    'frontend/admin/dashboard.html',
    'frontend/admin/results.html',
    'frontend/admin/manage/assessment-management.html',
    'frontend/user/effectiveness/evaluation.html',
    'frontend/user/satisfaction/satisfaction.html'
];

test('pages with the shared header use its theme and language controls without a duplicate toolbar', () => {
    for (const page of sharedHeaderPages) {
        const html = fs.readFileSync(path.join(root, page), 'utf8');
        assert.match(html, /assets\/js\/layout\/site-header\.js/, `${page} must mount the shared header`);
        assert.match(html, /assets\/js\/core\/theme-lang\.js[^>]*data-translation-only="true"/, `${page} must not inject a second toolbar`);
    }
    const home = fs.readFileSync(path.join(root, 'frontend/user/index.html'), 'utf8');
    assert.match(home, /id="app-site-header"/, 'the portal must mount the shared header');
    assert.doesNotMatch(home, /<header class="site-header">/, 'the portal must not keep a second static header');
});

test('admin layout uses the shared interface font token', () => {
    const css = fs.readFileSync(path.join(root, 'frontend/assets/css/layouts/admin-layout.css'), 'utf8');
    assert.match(css, /font-family:\s*var\(--font-sans\)/);
});

test('the shared header has one theme and language control with Thai and English labels', () => {
    const header = fs.readFileSync(path.join(root, 'frontend/assets/js/layout/site-header.js'), 'utf8');
    assert.equal((header.match(/id="theme-toggle"/g) || []).length, 1);
    assert.equal((header.match(/id="language-toggle"/g) || []).length, 1);
    const translations = fs.readFileSync(path.join(root, 'frontend/assets/js/core/theme-lang.js'), 'utf8');
    for (const key of ['portal_utility', 'portal_faculty', 'portal_faculty_en', 'portal_theme', 'portal_login', 'portal_contact_text', 'portal_guide_note']) {
        assert.equal((translations.match(new RegExp(`\\b${key}:`, 'g')) || []).length, 2, `${key} must exist in Thai and English`);
    }
    assert.doesNotMatch(header, /EvaluationLocale/, 'the shared header uses the shared theme and language module');
});

test('the shared header updates admin and guest navigation on auth changes without reload', () => {
    const header = fs.readFileSync(path.join(root, 'frontend/assets/js/layout/site-header.js'), 'utf8');
    assert.match(header, /document\.addEventListener\("evaluator:authchange",\s*event\s*=>\s*\{[\s\S]*?activeUser\s*=\s*event\.detail\?\.user\s*\|\|\s*null;[\s\S]*?renderHeaderNavigation\(navigation,\s*activeUser\?\.role\s*===\s*"admin"\s*\?\s*"admin"\s*:\s*activeUser\s*\?\s*"user"\s*:\s*"guest",\s*contactDialogId\);/);
    assert.doesNotMatch(header, /evaluator:authchange[\s\S]{0,500}location\.(?:reload|assign)/);
});

test('the homepage uses the shared system catalog instead of a duplicate list', () => {
    const html = fs.readFileSync(path.join(root, 'frontend/user/index.html'), 'utf8');
    const app = fs.readFileSync(path.join(root, 'frontend/assets/js/user/app.js'), 'utf8');
    assert.match(html, /assets\/js\/core\/api\.js/);
    assert.doesNotMatch(html, /assets\/js\/core\/systems-data\.js/);
    assert.match(app, /let systemCatalog = \[\]/);
    assert.match(app, /EvaluationAPI\?\.getSystems\(\)/);
    assert.doesNotMatch(app, /const systems = \[/);
});
