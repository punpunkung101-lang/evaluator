const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const authSource = fs.readFileSync(path.resolve(__dirname, 'auth.js'), 'utf8');

function createAuth(fetch) {
    const values = new Map();
    const authEvents = [];
    const sessionStorage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
    const document = {
        documentElement: { dataset: {} },
        querySelectorAll: () => [],
        getElementById: id => id === 'auth-control-styles' ? {} : null,
        addEventListener: () => {},
        dispatchEvent: event => { authEvents.push(event); return true; }
    };
    const context = {
        window: { CustomEvent: class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } } },
        document, sessionStorage, fetch, AbortController, setTimeout, clearTimeout, console
    };
    vm.runInNewContext(authSource, context);
    return { auth: context.window.EvaluatorAuth, sessionStorage, authEvents };
}

function response(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('login stores the backend top-level token with the verified account profile', async () => {
    const profile = { id: '00000000', username: 'Admin', displayName: 'Admin', role: 'admin' };
    const { auth, sessionStorage } = createAuth(async () => response({ success: true, user: profile, token: 'server-token' }));
    const user = await auth.login('Admin', 'password');
    auth.saveSession(user);
    assert.equal(sessionStorage.getItem('evaluatorToken'), 'server-token');
    assert.deepEqual(JSON.parse(sessionStorage.getItem('evaluatorProfile')), {
        id: profile.id, username: profile.username, displayName: profile.displayName, name: profile.displayName,
        evaluatorName: profile.displayName, role: profile.role, userRole: profile.role
    });
});

test('session verification rehydrates the profile from the backend after navigation or reload', async () => {
    let headers;
    const profile = { id: '00000007', username: 'person7', displayName: 'Person Seven', role: 'staff' };
    const { auth, sessionStorage } = createAuth(async (_url, options) => {
        headers = options.headers;
        return response({ success: true, user: profile });
    });
    sessionStorage.setItem('evaluatorToken', 'server-token');
    const user = await auth.verify();
    assert.equal(headers.Authorization, 'Bearer server-token');
    assert.equal(user.id, profile.id);
    assert.equal(auth.current().name, profile.displayName);
    assert.equal(sessionStorage.getItem('evaluatorToken'), 'server-token');
});

test('an expired or revoked session clears stale browser profile data', async () => {
    const { auth, sessionStorage } = createAuth(async () => response({ error: 'login required' }, 401));
    sessionStorage.setItem('evaluatorToken', 'expired-token');
    sessionStorage.setItem('evaluatorProfile', JSON.stringify({ id: '00000007', name: 'Stale name' }));
    await assert.rejects(auth.verify(), error => error.status === 401);
    assert.equal(sessionStorage.getItem('evaluatorToken'), null);
    assert.equal(sessionStorage.getItem('evaluatorProfile'), null);
});

test('logout clears the browser token and profile even when the request completes', async () => {
    const { auth, sessionStorage } = createAuth(async () => response({ success: true }));
    sessionStorage.setItem('evaluatorToken', 'server-token');
    sessionStorage.setItem('evaluatorProfile', JSON.stringify({ id: '00000007', name: 'Person Seven' }));
    await auth.logout();
    assert.equal(sessionStorage.getItem('evaluatorToken'), null);
    assert.equal(sessionStorage.getItem('evaluatorProfile'), null);
});

test('rendering login and logout dispatches auth changes immediately for shared navigation', async () => {
    const { auth, authEvents } = createAuth(async () => response({ success: true }));
    await auth.renderAuthButton({ id: '00000000', username: 'Admin', displayName: 'Admin', role: 'admin' });
    await auth.renderAuthButton(null);

    assert.equal(authEvents.length, 2);
    assert.equal(authEvents[0].type, 'evaluator:authchange');
    assert.equal(authEvents[0].detail.user.role, 'admin');
    assert.equal(authEvents[1].type, 'evaluator:authchange');
    assert.equal(authEvents[1].detail.user, null);
});

test('the satisfaction landing page stays browsable before login and verifies only when starting', () => {
    const root = path.resolve(__dirname, '../../../..');
    const index = fs.readFileSync(path.join(root, 'frontend/user/satisfaction/index.html'), 'utf8');
    assert.doesNotMatch(index, /core\/login-guard\.js/);
    assert.match(index, /window\.EvaluatorAuth\.verify\(\)/);
    assert.match(index, /returnTo/);
});

test('the effectiveness evaluator identity is read-only and cannot replace the verified profile', () => {
    const root = path.resolve(__dirname, '../../../..');
    const html = fs.readFileSync(path.join(root, 'frontend/user/satisfaction/evaluation.html'), 'utf8');
    const logic = fs.readFileSync(path.join(root, 'frontend/assets/js/user/evaluation.js'), 'utf8');
    assert.doesNotMatch(html, /id="evaluator-name"|id="user-role"/);
    assert.match(html, /id="evaluator-account"/);
    assert.doesNotMatch(logic, /sessionStorage\.setItem\("evaluatorProfile",\s*JSON\.stringify\(/);
});

test('the shared auth button renders the verified identity menu and logout on every auth control', () => {
    assert.match(authSource, /async renderAuthButton\(user\)/);
    assert.match(authSource, /this\.verify\(\)/);
    assert.match(authSource, /\.ev-signin, \.login-button, \[data-auth-control\]/);
    assert.match(authSource, /activeUser\?\.displayName/);
    assert.match(authSource, /data-auth-role/);
    assert.match(authSource, /data-auth-id/);
    assert.match(authSource, /ออกจากระบบ/);
    assert.match(authSource, /auth\.logout\(\)/);
    assert.match(authSource, /label\.removeAttribute\("data-i18n"\)/);
});

test('renderAuthButton returns the signed-in identity and returns to the login state after logout', async () => {
    const { auth } = createAuth(async () => response({ success: true }));
    const user = { id: '00000009', username: 'person9', displayName: 'Person Nine', role: 'teacher' };
    const rendered = await auth.renderAuthButton(user);
    assert.equal(rendered.displayName, user.displayName);
    assert.equal(rendered.role, user.role);
    assert.equal(rendered.id, user.id);
    assert.equal(await auth.renderAuthButton(null), null);
});

test('all admin pages use the shared auth control and backend-verified admin guard', () => {
    const root = path.resolve(__dirname, '../../../..');
    for (const page of [
        'frontend/admin/dashboard.html',
        'frontend/admin/manage/assessment-management.html',
        'frontend/admin/evaluation-detail.html',
        'frontend/admin/manage/processes.html'
    ]) {
        const html = fs.readFileSync(path.join(root, page), 'utf8');
        assert.match(html, /core\/admin-guard\.js/);
        assert.match(html, /core\/auth\.js/);
        assert.match(html, /assets\/js\/layout\/site-header\.js/);
    }
    const guard = fs.readFileSync(path.join(root, 'frontend/assets/js/core/admin-guard.js'), 'utf8');
    assert.match(guard, /fetch\(`\$\{base\}\/auth\/me`/);
    assert.match(guard, /user\.role !== "admin"/);
    assert.match(guard, /window\.AdminGuard = \{ ready \}/);
    assert.doesNotMatch(guard, /sessionStorage\.getItem\("evaluatorProfile"\).*role/);
    const nav = fs.readFileSync(path.join(root, 'frontend/assets/js/layout/site-header.js'), 'utf8');
    assert.match(nav, /class="[^"]*ev-signin/);
    assert.match(nav, /navConfig\.header\[role\]/);
    assert.match(nav, /activeUser\?\.role === "admin"/);
    const navigation = require('../layout/nav-config.js');
    assert.deepEqual(navigation.header.admin.map(item => item.id), ['home', 'overview', 'results']);
    assert.deepEqual(navigation.header.admin.slice(1), navigation.sidebar.admin);
});

test('dashboard API endpoints distinguish missing sessions from non-admin sessions using DB role checks', () => {
    const root = path.resolve(__dirname, '../../../..');
    const backend = fs.readFileSync(path.join(root, 'backend/src/main.cpp'), 'utf8');
    assert.match(backend, /method == "GET" && route == "\/auth\/me"/);
    assert.match(backend, /SELECT u\.id,u\.username,u\.display_name,u\.role FROM auth_sessions s JOIN users u ON u\.id=s\.user_id WHERE s\.token=\?/);
    assert.match(backend, /if \(role != "admin"\)/);
    for (const route of ['/questions/replace', '/quantitative', '/evaluations']) {
        assert.ok(backend.includes(`route == "${route}"`), `expected protected dashboard route ${route}`);
    }
});
