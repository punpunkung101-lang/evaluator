const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../..');
const source = fs.readFileSync(path.join(root, 'frontend/assets/js/core/demo-mode.js'), 'utf8');
const snapshotSource = fs.readFileSync(path.join(root, 'frontend/assets/data/mock-snapshot.js'), 'utf8');

function setup({ search = '', token = null, flag = null, loadSnapshot = true } = {}) {
    const values = new Map();
    if (token) values.set('evaluatorToken', token);
    if (flag) values.set('evaluatorDemo', flag);
    const sessionStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k) };
    const realCalls = [];
    const window = {
        sessionStorage, location: { search, href: 'http://127.0.0.1:5500/frontend/admin/dashboard.html' + search },
        addEventListener() {}, fetch: async (url, init) => { realCalls.push({ url: String(url), init }); return new Response('[]'); }
    };
    window.window = window;
    const document = { currentScript: { src: 'http://127.0.0.1:5500/frontend/assets/js/core/demo-mode.js' }, readyState: 'loading',
        addEventListener() {}, createElement: () => ({ style: {}, append() {}, setAttribute() {} }), body: { append() {} }, written: [], write(h) { this.written.push(h); } };
    const context = vm.createContext({ window, document, sessionStorage, URL, URLSearchParams, Response, console });
    if (loadSnapshot) vm.runInContext(snapshotSource, context);
    vm.runInContext(source, context);
    return { window, document, realCalls, values };
}
const api = path => 'http://127.0.0.1:8080' + path;

test('demo mode is off by default and leaves fetch untouched', async () => {
    const s = setup();
    assert.equal(s.window.EvaluatorDemo.active, false);
    await s.window.fetch(api('/evaluations'));
    assert.equal(s.realCalls.length, 1);
});

test('?demo=1 serves mock GET data from the snapshot and loads the snapshot lazily', async () => {
    const s = setup({ search: '?demo=1', loadSnapshot: false });
    assert.equal(s.window.EvaluatorDemo.active, true);
    assert.match(s.document.written[0], /assets\/data\/mock-snapshot\.js/);
    vm.runInContext(snapshotSource, vm.createContext(s.window)); // simulate the written <script> executing
    const evaluations = await (await s.window.fetch(api('/evaluations'))).json();
    assert.ok(evaluations.length > 0 && evaluations.every(r => r.id.startsWith('mock-eval-')));
    const quantitative = await (await s.window.fetch(api('/quantitative'))).json();
    assert.ok(quantitative.length > 0);
    assert.equal((await (await s.window.fetch(api('/systems'))).json()).length, 21);
    const me = await (await s.window.fetch(api('/auth/me'))).json();
    assert.equal(me.user.role, 'admin');
    assert.equal(s.realCalls.length, 0);
});

test('demo mode never writes: POST/DELETE are rejected and nothing reaches the backend', async () => {
    const s = setup({ search: '?demo=1' });
    for (const method of ['POST', 'PUT', 'DELETE']) {
        const response = await s.window.fetch(api('/evaluations'), { method });
        assert.equal(response.status, 403);
    }
    assert.equal(s.realCalls.length, 0);
});

test('a real login token or ?demo=0 turns demo mode off', () => {
    assert.equal(setup({ flag: '1', token: 'abc' }).window.EvaluatorDemo.active, false);
    assert.equal(setup({ flag: '1', search: '?demo=0' }).window.EvaluatorDemo.active, false);
    assert.equal(setup({ flag: '1' }).window.EvaluatorDemo.active, true);
});
