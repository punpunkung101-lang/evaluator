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
