const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const apiSource = fs.readFileSync(path.resolve(__dirname, 'api.js'), 'utf8');

test('API errors preserve HTTP status for form-specific handling', async () => {
    const context = {
        window: {},
        sessionStorage: { getItem: () => 'session-token' },
        fetch: async () => ({ ok: false, status: 401, json: async () => ({ error: 'session expired' }) })
    };
    vm.runInNewContext(apiSource, context);

    await assert.rejects(context.window.EvaluationAPI.request('/evaluations'), error => {
        assert.equal(error.status, 401);
        assert.equal(error.message, 'session expired');
        return true;
    });
});

test('typed form API fetches systems/options and waits for the backend to confirm submissions', async () => {
    const calls = [];
    const context = {
        window: {},
        URLSearchParams,
        sessionStorage: { getItem: () => 'session-token' },
        fetch: async (url, options = {}) => {
            calls.push({ url, options });
            const body = options.method === 'POST' ? { success: true, id: 'eval-1' }
                : url.includes('/systems') ? [{ id: 'SYS001' }]
                    : url.includes('/option-sets') ? [{ id: 'roles_SYS001' }] : [];
            return { ok: true, status: options.method === 'POST' ? 201 : 200, json: async () => body };
        }
    };
    vm.runInNewContext(apiSource, context);
    const api = context.window.EvaluationAPI;
    assert.deepEqual(Array.from(await api.getSystems(), item => item.id), ['SYS001']);
    assert.deepEqual(Array.from(await api.getOptionSets('SYS001'), item => item.id), ['roles_SYS001']);
    const payload = { id: 'eval-1', systemId: 'SYS001', assessmentType: 'satisfaction', formVersionId: 'v1', respondentRole: 'ผู้ใช้', answers: [] };
    const result = await api.submitAnswers(payload);
    assert.equal(result.success, true);
    assert.equal(JSON.parse(calls[2].options.body).formVersionId, 'v1');
    assert.match(calls[2].url, /\/evaluations$/);
});

test('admin question API reads inactive versions and publishes specific and shared core updates', async () => {
    const calls = [];
    const context = {
        window: {}, URLSearchParams,
        sessionStorage: { getItem: () => 'admin-token' },
        fetch: async (url, options = {}) => {
            calls.push({ url, options });
            return { ok: true, status: 200, json: async () => url.includes('replace') ? { success: true } : [{ id: 'q1', active: false }] };
        }
    };
    vm.runInNewContext(apiSource, context);
    const api = context.window.EvaluationAPI;
    assert.equal((await api.getAdminQuestions('SYS018', 'satisfaction'))[0].active, false);
    await api.replaceQuestions('SYS018', 'satisfaction', [{ id: 'q1', active: false }]);
    await api.replaceCoreQuestions('satisfaction', [{ id: 'S1', indicator_group: 'core' }]);
    assert.match(calls[0].url, /include_inactive=1/);
    assert.match(calls[1].url, /\/questions\/replace$/);
    assert.match(calls[2].url, /\/questions\/replace-core$/);
    assert.equal(JSON.parse(calls[2].options.body).assessmentType, 'satisfaction');
});

test('Admin can read and save the improvement signal criteria through the protected settings endpoint', async () => {
    const calls = [];
    const context = { window: {}, sessionStorage: { getItem: () => 'admin-token' }, fetch: async (url, options = {}) => {
        calls.push({ url, options });
        return { ok: true, status: 200, json: async () => ({ improvement: { minimumRespondents: 10 } }) };
    } };
    vm.runInNewContext(apiSource, context);
    const api = context.window.EvaluationAPI;
    assert.equal((await api.getImprovementSettings()).improvement.minimumRespondents, 10);
    await api.saveImprovementSettings({ minimumRespondents: 12 });
    assert.equal(calls[0].url, 'http://127.0.0.1:8080/settings/improvement');
    assert.equal(calls[1].options.method, 'PUT');
    assert.equal(JSON.parse(calls[1].options.body).improvement.minimumRespondents, 12);
});

test('Admin option set updates use the protected system-scoped endpoint', async () => {
    const calls = [];
    const context = { window: {}, sessionStorage: { getItem: () => 'admin-token' }, fetch: async (url, options = {}) => {
        calls.push({ url, options });
        return { ok: true, status: 200, json: async () => ({ success: true }) };
    } };
    vm.runInNewContext(apiSource, context);
    const optionSets = [{ id: 'roles_SYS018', systemId: 'SYS018', valuesBySystem: {}, valuesByRole: {}, dependsOn: {} }];
    await context.window.EvaluationAPI.replaceOptionSets('SYS018', optionSets);
    assert.equal(calls[0].url, 'http://127.0.0.1:8080/option-sets/replace');
    assert.equal(JSON.parse(calls[0].options.body).systemId, 'SYS018');
});
