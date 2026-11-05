const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const authSource = fs.readFileSync(path.resolve(__dirname, '../../frontend/Satisfaction_Survey/assets/js/shared/auth.js'), 'utf8');

function createAuth(fetch) {
    const values = new Map();
    const sessionStorage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
    const document = {
        documentElement: { dataset: {} },
        querySelectorAll: () => [],
        getElementById: id => id === 'auth-control-styles' ? {} : null,
        addEventListener: () => {}
    };
    const context = { window: {}, document, sessionStorage, fetch, AbortController, setTimeout, clearTimeout, console };
    vm.runInNewContext(authSource, context);
    return { auth: context.window.EvaluatorAuth, sessionStorage };
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

test('the satisfaction landing page stays browsable before login and verifies only when starting', () => {
    const root = path.resolve(__dirname, '../..');
    const index = fs.readFileSync(path.join(root, 'frontend/Satisfaction_Survey/user/index.html'), 'utf8');
    assert.doesNotMatch(index, /shared\/login-guard\.js/);
    assert.match(index, /window\.EvaluatorAuth\.verify\(\)/);
    assert.match(index, /returnTo/);
});

test('the effectiveness evaluator identity is read-only and cannot replace the verified profile', () => {
    const root = path.resolve(__dirname, '../..');
    const html = fs.readFileSync(path.join(root, 'frontend/Satisfaction_Survey/user/evaluation.html'), 'utf8');
    const logic = fs.readFileSync(path.join(root, 'frontend/Satisfaction_Survey/assets/js/user/evaluation.js'), 'utf8');
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
    const root = path.resolve(__dirname, '../..');
    for (const page of [
        'frontend/Satisfaction_Survey/admin/dashboard.html',
        'frontend/Satisfaction_Survey/admin/assessment-management.html',
        'frontend/Satisfaction_Survey/admin/evaluation-detail.html',
        'frontend/Effectiveness_Of_It/main/admin.html'
    ]) {
        const html = fs.readFileSync(path.join(root, page), 'utf8');
        assert.match(html, /shared\/admin-guard\.js/);
        assert.match(html, /shared\/auth\.js/);
        assert.match(html, /shared\/site-nav\.js/);
    }
    const guard = fs.readFileSync(path.join(root, 'frontend/Satisfaction_Survey/assets/js/shared/admin-guard.js'), 'utf8');
    assert.match(guard, /fetch\(`\$\{base\}\/auth\/me`/);
    assert.match(guard, /result\.user\.role !== "admin"/);
    assert.doesNotMatch(guard, /sessionStorage\.getItem\("evaluatorProfile"\).*role/);
    const nav = fs.readFileSync(path.join(root, 'frontend/Satisfaction_Survey/assets/js/shared/site-nav.js'), 'utf8');
    assert.match(nav, /class="ev-signin"/);
});

test('dashboard API endpoints distinguish missing sessions from non-admin sessions using DB role checks', () => {
    const root = path.resolve(__dirname, '../..');
    const backend = fs.readFileSync(path.join(root, 'backend/src/main.cpp'), 'utf8');
    assert.match(backend, /if\(method=="GET"&&route=="\/auth\/me"\)/);
    assert.match(backend, /SELECT u\.id,u\.username,u\.display_name,u\.role FROM auth_sessions s JOIN users u ON u\.id=s\.user_id WHERE s\.token=\?/);
    assert.match(backend, /if\(!sessionUser\(db,token,id,username,display,role\)\)\{status=401;return false;\}if\(role!="admin"\)\{status=403;return false;\}/);
    for (const route of ['/questions/replace', '/quantitative', '/evaluations']) {
        assert.ok(backend.includes(`route=="${route}"`), `expected protected dashboard route ${route}`);
    }
});
