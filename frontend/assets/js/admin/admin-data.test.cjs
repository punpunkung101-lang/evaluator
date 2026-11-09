const test = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('./admin-data.js');

test('admin data client reads both result endpoints and system list with auth', async () => {
    const calls = [];
    const client = createClient({
        baseUrl: 'http://api.test', token: 'read-token',
        fetchImpl: async (url, options) => {
            calls.push([url, options]);
            return { ok: true, json: async () => [] };
        }
    });
    const results = await client.load();
    assert.deepEqual([results.systems.status, results.effectiveness.status, results.satisfaction.status], ['fulfilled', 'fulfilled', 'fulfilled']);
    assert.deepEqual(calls.map(item => item[0]), ['http://api.test/systems', 'http://api.test/quantitative', 'http://api.test/evaluations']);
    assert.ok(calls.every(([, options]) => options.headers.Authorization === 'Bearer read-token'));
});

test('admin data client reports per-endpoint failures without hiding successful datasets', async () => {
    const client = createClient({ baseUrl: '', token: '', fetchImpl: async url => ({
        ok: !url.endsWith('/quantitative'), status: 503,
        json: async () => []
    }) });
    const results = await client.load();
    assert.equal(results.systems.status, 'fulfilled');
    assert.equal(results.effectiveness.status, 'rejected');
    assert.equal(results.satisfaction.status, 'fulfilled');
});
