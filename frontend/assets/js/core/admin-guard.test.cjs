const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../..');
const source = fs.readFileSync(path.join(root, 'frontend/assets/js/core/admin-guard.js'), 'utf8');

function setup(fetch, withToken = true, staleProfile = false) {
    const values = new Map();
    if (withToken) {
        values.set('evaluatorToken', 'session-token');
        values.set('evaluatorProfile', JSON.stringify({ id: 'stale', role: 'admin' }));
    }
    if (staleProfile) values.set('evaluatorProfile', JSON.stringify({ id: 'stale', role: 'admin' }));
    const sessionStorage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
    class Element {
        constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.classList = { values: new Set(), add: v => this.classList.values.add(v), remove: v => this.classList.values.delete(v), contains: v => this.classList.values.has(v) }; }
        append(...items) { this.children.push(...items); }
        replaceChildren(...items) { this.children = [...items]; }
        setAttribute(key, value) { this.attributes[key] = String(value); }
        addEventListener() {}
    }
    const document = {
        documentElement: new Element('html'), head: new Element('head'), body: new Element('body'),
        readyState: 'complete', currentScript: { src: 'http://127.0.0.1:5500/frontend/assets/js/core/admin-guard.js' }, createElement: tag => new Element(tag), addEventListener() {}
    };
    document.body.append(new Element('admin-dashboard-content'));
    const location = {
        pathname: '/frontend/admin/dashboard.html', search: '?system=SYS002', hash: '',
        href: 'http://127.0.0.1:5500/frontend/admin/dashboard.html?system=SYS002',
        origin: 'http://127.0.0.1:5500',
        replaced: '', replace(url) { this.replaced = url; }
    };
    const window = { EvaluatorRuntimeUrl: { fromScript: (path, script) => new URL(path, script).href } };
    vm.runInNewContext(source, { window, document, sessionStorage, location, URL, fetch, console, setTimeout });
    return { guard: window.AdminGuard, sessionStorage, document, location };
}

const response = (status, user) => ({
    status, ok: status >= 200 && status < 300,
    json: async () => ({ user })
});

test('AdminGuard.ready resolves only after the backend verifies an admin', async () => {
    let request;
    const state = setup(async (url, options) => { request = { url, options }; return response(200, { id: '00000000', role: 'admin' }); });
    assert.equal(typeof state.guard.ready.then, 'function');
    const user = await state.guard.ready;
    assert.equal(user.role, 'admin');
    assert.equal(request.url, 'http://127.0.0.1:8080/auth/me');
    assert.equal(request.options.headers.Authorization, 'Bearer session-token');
    assert.equal(state.document.documentElement.classList.contains('auth-pending'), false);
    assert.equal(state.document.body.children[0].tagName, 'admin-dashboard-content');
});

test('a valid non-admin sees only the denial page and stale admin content is removed', async () => {
    const state = setup(async () => response(200, { id: '00000001', role: 'teacher' }));
    await assert.rejects(state.guard.ready, /admin role required/);
    assert.equal(state.document.body.children.length, 1);
    assert.equal(state.document.body.children[0].className, 'admin-gate');
    assert.equal(state.document.body.children[0].children[0].children[0].textContent, 'ไม่มีสิทธิ์เข้าถึง Admin');
    assert.equal(state.document.documentElement.classList.contains('auth-pending'), false);
});

test('an expired token clears both auth keys and redirects back to the Admin page', async () => {
    const state = setup(async () => response(401));
    await assert.rejects(state.guard.ready, /login required/);
    assert.equal(state.sessionStorage.getItem('evaluatorToken'), null);
    assert.equal(state.sessionStorage.getItem('evaluatorProfile'), null);
    const destination = new URL(state.location.replaced);
    assert.equal(destination.searchParams.get('login'), '1');
    assert.equal(destination.searchParams.get('returnTo'), '/frontend/admin/dashboard.html?system=SYS002');
});

test('a guest is redirected to login with returnTo and any stale profile is cleared', async () => {
    const state = setup(async () => { throw new Error('fetch should not be called'); }, false, true);
    await assert.rejects(state.guard.ready, /login required/);
    assert.equal(state.sessionStorage.getItem('evaluatorToken'), null);
    assert.equal(state.sessionStorage.getItem('evaluatorProfile'), null);
    assert.ok(state.location.replaced.includes('login=1'));
    assert.ok(state.location.replaced.includes('returnTo='));
});

test('a backend error fails closed and replaces the Admin document with an error page', async () => {
    const state = setup(async () => { throw new Error('offline'); });
    await assert.rejects(state.guard.ready, /offline/);
    assert.equal(state.document.body.children.length, 1);
    assert.equal(state.document.body.children[0].children[0].children[0].textContent, 'ตรวจสอบสิทธิ์ไม่สำเร็จ');
    assert.equal(state.document.documentElement.classList.contains('auth-pending'), false);
});

test('all active Admin pages wait for the backend guard and report API failures', () => {
    const overview = read('frontend/assets/js/admin/admin-overview.js');
    const manager = read('frontend/assets/js/admin/question-admin.js');
    const results = read('frontend/assets/js/admin/system-results.js');
    assert.match(overview, /await window\.AdminGuard\.ready/);
    assert.match(manager, /await window\.AdminGuard\.ready/);
    assert.match(results, /await window\.AdminGuard\.ready/);
    assert.match(overview, /โหลดภาพรวมไม่ได้/);
    assert.match(manager, /บันทึกไม่สำเร็จ/);
    assert.match(results, /โหลดผลประเมินไม่ได้/);
});

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
