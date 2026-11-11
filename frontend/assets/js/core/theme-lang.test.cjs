const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'theme-lang.js'), 'utf8');

function loadThemeController(storedTheme) {
    const values = new Map(storedTheme === undefined ? [] : [['it_eval_theme', storedTheme]]);
    const document = {
        currentScript: null,
        readyState: 'loading',
        addEventListener() {},
        documentElement: { setAttribute() {} },
        body: { classList: { toggle() {} } }
    };
    const window = {};
    vm.runInNewContext(source, {
        window,
        document,
        localStorage: {
            getItem(key) { return values.get(key) ?? null; },
            setItem(key, value) { values.set(key, value); }
        },
        CustomEvent: class CustomEvent {},
        console
    });
    return window.ThemeLang;
}

test('theme normalization accepts light and dark and migrates legacy navy and falls back for invalid or empty values', () => {
    const themes = loadThemeController();
    assert.equal(themes.normalizeTheme('light'), 'light');
    assert.equal(themes.normalizeTheme('dark'), 'dark');
    assert.equal(themes.normalizeTheme('navy'), 'dark');
    assert.equal(themes.normalizeTheme('unknown'), 'light');
    assert.equal(themes.normalizeTheme(''), 'light');
    assert.equal(themes.normalizeTheme(null), 'light');
});

test('stored theme values normalize safely and unknown values use the light default', () => {
    assert.equal(loadThemeController('navy').getTheme(), 'dark');
    assert.equal(loadThemeController('old-theme').getTheme(), 'light');
    assert.equal(loadThemeController('').getTheme(), 'light');
});
