const test = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('./admin-data.js');

test('admin data client loads the database catalog, typed submissions, and both question types', async () => {
    const calls = [];
    const systems = [{ id: 'SYS001', name: 'Directory' }, { id: 'SYS002', name: 'Leave' }];
    const evaluations = [
        { id: 'e1', systemId: 'SYS001', assessmentType: 'effectiveness' },
        { id: 's1', systemId: 'SYS002', assessmentType: 'satisfaction' }
    ];
    const client = createClient({
        baseUrl: 'http://api.test', token: 'admin-token',
        fetchImpl: async (url, options) => {
            calls.push([url, options]);
            const body = url.endsWith('/systems') ? systems : url.endsWith('/evaluations') ? evaluations : url.endsWith('/settings/improvement') ? { improvement: { minimumRespondents: 10 } } : [{ id: 'q1', assessment_type: new URL(url).searchParams.get('assessment_type'), system_id: null }];
            return { ok: true, json: async () => body };
        }
    });
    const result = await client.load();
    assert.deepEqual(result.systems, systems);
    assert.deepEqual(result.evaluations, evaluations);
    assert.equal(result.effectiveness.length, 1);
    assert.equal(result.satisfaction.length, 1);
    assert.equal(result.scoringConfig.minimumRespondents, 10);
    assert.equal(result.questions.length, 2, 'shared Core questions are deduplicated across system endpoints');
    assert.ok(result.questions.every(question => question.assessmentType === question.assessment_type));
    assert.equal(result.questions[0].systemId, null);
    assert.equal(calls.length, 7);
    assert.ok(calls.every(([, options]) => options.headers.Authorization === 'Bearer admin-token'));
    assert.ok(calls.some(([url]) => url.includes('system_id=SYS001') && url.includes('assessment_type=effectiveness')));
    assert.ok(calls.some(([url]) => url.includes('system_id=SYS002') && url.includes('assessment_type=satisfaction')));
});

test('admin data client surfaces failures instead of silently substituting a legacy catalog', async () => {
    const client = createClient({ baseUrl: '', token: '', fetchImpl: async url => ({ ok: !url.endsWith('/evaluations'), status: 503, json: async () => [] }) });
    await assert.rejects(client.load(), /HTTP 503 for \/evaluations/);
});
