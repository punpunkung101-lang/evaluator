'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const examples = require('./effectiveness-examples.js');

const nonEmptyText = value => typeof value === 'string' && value.trim().length > 0;

test('effectiveness examples provide Thai and English copy for every metric', () => {
    assert.ok(examples.metrics.length > 0);
    for (const metric of examples.metrics) {
        assert.ok(metric.name && nonEmptyText(metric.name.th) && nonEmptyText(metric.name.en), `${metric.id}: bilingual name`);
        assert.ok(metric.dimension && nonEmptyText(metric.dimension.th) && nonEmptyText(metric.dimension.en), `${metric.id}: bilingual dimension`);
        assert.ok(metric.unit && nonEmptyText(metric.unit.th) && nonEmptyText(metric.unit.en), `${metric.id}: bilingual unit`);
        assert.ok(metric.formula && nonEmptyText(metric.formula.th) && nonEmptyText(metric.formula.en), `${metric.id}: bilingual formula`);
        assert.ok(metric.source && nonEmptyText(metric.source.th) && nonEmptyText(metric.source.en), `${metric.id}: bilingual source`);
    }
});

test('effectiveness metric identifiers are unique and weights total 100', () => {
    const ids = examples.metrics.map(metric => metric.id);
    assert.equal(new Set(ids).size, ids.length, 'metric identifiers must not repeat');
    assert.ok(examples.metrics.every(metric => Number.isFinite(metric.weight) && metric.weight >= 0));
    assert.equal(examples.metrics.reduce((sum, metric) => sum + metric.weight, 0), 100);
});

test('process example groups provide Thai and English before and after examples', () => {
    for (const [groupName, group] of Object.entries(examples.groups)) {
        for (const language of ['th', 'en']) {
            for (const phase of ['before', 'after']) {
                assert.ok(Array.isArray(group[language][phase]) && group[language][phase].length > 0, `${groupName}.${language}.${phase}`);
                for (const [name, description] of group[language][phase]) {
                    assert.ok(nonEmptyText(name) && nonEmptyText(description), `${groupName}.${language}.${phase} has text`);
                }
            }
        }
    }
});

test('generic process examples avoid repair-specific wording', () => {
    const genericText = JSON.stringify(examples.groups.generic).toLowerCase();
    assert.doesNotMatch(genericText, /แจ้งซ่อม/);
});
