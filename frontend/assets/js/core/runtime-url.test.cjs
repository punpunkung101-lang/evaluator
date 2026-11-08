const test = require('node:test');
const assert = require('node:assert/strict');
const { fromScript } = require('./runtime-url.js');

test('runtime URLs resolve from scripts when served from the repository root', () => {
    const script = 'http://127.0.0.1:5500/frontend/assets/js/user/app.js';
    assert.equal(
        fromScript('../../../user/effectiveness/evaluation.html', script),
        'http://127.0.0.1:5500/frontend/user/effectiveness/evaluation.html'
    );
    assert.equal(
        fromScript('../../../assets/img/Nu_bage.png', 'http://127.0.0.1:5500/frontend/assets/js/layout/site-header.js'),
        'http://127.0.0.1:5500/frontend/assets/img/Nu_bage.png'
    );
});

test('runtime URLs resolve from scripts when Live Server root is frontend', () => {
    const script = 'http://127.0.0.1:5500/assets/js/user/app.js';
    assert.equal(
        fromScript('../../../user/effectiveness/evaluation.html', script),
        'http://127.0.0.1:5500/user/effectiveness/evaluation.html'
    );
    assert.equal(
        fromScript('../../../assets/img/Nu_bage.png', 'http://127.0.0.1:5500/assets/js/layout/site-header.js'),
        'http://127.0.0.1:5500/assets/img/Nu_bage.png'
    );
});
