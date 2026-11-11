const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function sRGBtoLin(colorChannel) {
    colorChannel = colorChannel / 255;
    return colorChannel <= 0.04045
        ? colorChannel / 12.92
        : Math.pow((colorChannel + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
    hex = hex.trim();
    if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

function contrastRatio(hex1, hex2) {
    const l1 = luminance(hex1);
    const l2 = luminance(hex2);
    const bright = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return (bright + 0.05) / (dark + 0.05);
}

function parseTokens(cssContent) {
    // Strip comments first to prevent comment braces from confusing tokenizer
    const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');
    const themes = {
        light: {},
        dark: {},
        navy: {}
    };

    let i = 0;
    while (i < cleanCss.length) {
        if (cleanCss[i] === '{') {
            let selStart = i - 1;
            while (selStart >= 0 && cleanCss[selStart] !== '}' && cleanCss[selStart] !== ';') {
                selStart--;
            }
            const rawSel = cleanCss.slice(selStart + 1, i).trim();
            let depth = 1;
            let j = i + 1;
            while (j < cleanCss.length && depth > 0) {
                if (cleanCss[j] === '{') depth++;
                else if (cleanCss[j] === '}') depth--;
                j++;
            }
            const body = cleanCss.slice(i + 1, j - 1);
            const selectors = rawSel.split(',').map(s => s.trim());
            const targetThemes = [];

            for (const sel of selectors) {
                if (sel === ':root') {
                    targetThemes.push('light');
                } else if (sel.includes('[data-theme="dark"]') || sel === 'body.dark') {
                    targetThemes.push('dark');
                } else if (sel.includes('[data-theme="navy"]')) {
                    targetThemes.push('navy');
                }
            }

            if (targetThemes.length) {
                const propRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
                let propMatch;
                while ((propMatch = propRegex.exec(body)) !== null) {
                    const propName = propMatch[1].trim();
                    const propValue = propMatch[2].trim();
                    for (const theme of targetThemes) {
                        themes[theme][propName] = propValue;
                    }
                }
            }
            i = j;
        } else {
            i++;
        }
    }

    return themes;
}

test('tokens.css contains required chart tokens for all two themes and passes WCAG contrast', () => {
    const cssPath = path.resolve(__dirname, '../../css/tokens.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const themes = parseTokens(cssContent);

    const requiredTokens = [
        '--chart-effectiveness',
        '--chart-satisfaction',
        '--chart-before',
        '--chart-level-1',
        '--chart-level-2',
        '--chart-level-3',
        '--chart-level-4',
        '--chart-level-5',
        '--chart-grid',
        '--chart-axis',
        '--chart-track'
    ];

    const themeNames = ['light', 'dark'];
    for (const theme of themeNames) {
        assert.ok(themes[theme]['--bg-surface'], `Missing --bg-surface in theme ${theme}`);
        for (const token of requiredTokens) {
            assert.ok(themes[theme][token], `Missing ${token} in theme ${theme}`);
        }
    }

    const reportTable = [];
    const failures = [];

    for (const token of requiredTokens) {
        const isText = token === '--chart-axis';
        const minRatio = isText ? 4.5 : 3.0;

        const row = {
            token,
            type: isText ? 'text (>=4.5)' : 'graphic (>=3.0)'
        };

        for (const theme of themeNames) {
            const surfaceHex = themes[theme]['--bg-surface'];
            const tokenHex = themes[theme][token];
            const ratio = contrastRatio(tokenHex, surfaceHex);
            const ratioFormatted = ratio.toFixed(2);
            row[theme] = `${tokenHex} (${ratioFormatted}:1)`;

            if (ratio < minRatio) {
                failures.push(`${token} in ${theme} theme (${tokenHex} on ${surfaceHex}) has contrast ${ratioFormatted}:1, required >= ${minRatio}:1`);
            }
        }
        reportTable.push(row);
    }

    console.log('\n=== WCAG Contrast Report (Chart Tokens vs --bg-surface) ===');
    console.table(reportTable);

    assert.equal(failures.length, 0, `Contrast failures:\n${failures.join('\n')}`);
});

test('adjacent chart levels have contrast >= 1.3:1 and levels have >= 3.0:1 vs --bg-surface across all two themes', () => {
    const cssPath = path.resolve(__dirname, '../../css/tokens.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const themes = parseTokens(cssContent);
    const themeNames = ['light', 'dark'];
    const levelTokens = [
        '--chart-level-1',
        '--chart-level-2',
        '--chart-level-3',
        '--chart-level-4',
        '--chart-level-5'
    ];

    const adjacentReport = [];
    const failures = [];

    for (const theme of themeNames) {
        const surfaceHex = themes[theme]['--bg-surface'];
        for (const token of levelTokens) {
            const hex = themes[theme][token];
            const ratio = contrastRatio(hex, surfaceHex);
            if (ratio < 3.0) {
                failures.push(`${token} in ${theme} (${hex} on ${surfaceHex}) has contrast ${ratio.toFixed(2)}:1, expected >= 3.0:1`);
            }
        }

        for (let i = 0; i < levelTokens.length - 1; i++) {
            const t1 = levelTokens[i];
            const t2 = levelTokens[i + 1];
            const hex1 = themes[theme][t1];
            const hex2 = themes[theme][t2];
            const ratio = contrastRatio(hex1, hex2);
            const ratioFormatted = ratio.toFixed(2);
            adjacentReport.push({
                theme,
                pair: `${t1} vs ${t2}`,
                colors: `${hex1} vs ${hex2}`,
                contrast: `${ratioFormatted}:1`
            });
            if (ratio < 1.30) {
                failures.push(`${t1} vs ${t2} in ${theme} theme (${hex1} vs ${hex2}) has contrast ${ratioFormatted}:1, required >= 1.3:1`);
            }
        }
    }

    console.log('\n=== Adjacent Chart Level Contrast Report (Required >= 1.3:1) ===');
    console.table(adjacentReport);

    assert.equal(failures.length, 0, `Adjacent level contrast failures:\n${failures.join('\n')}`);
});
