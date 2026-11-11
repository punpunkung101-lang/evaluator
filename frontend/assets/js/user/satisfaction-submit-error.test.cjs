const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const satisfactionSource = fs.readFileSync(path.resolve(__dirname, 'satisfaction.js'), 'utf8');

function loadFailureReason(apiBaseUrl = 'http://127.0.0.1:8080') {
    const context = {
        window: { API_CONFIG: { backendBaseUrl: apiBaseUrl } },
        document: { addEventListener: () => {} }
    };
    vm.runInNewContext(satisfactionSource, context);
    return { reason: context.getSatisfactionSubmissionFailureReason, source: satisfactionSource };
}

test('network failures name the unreachable API URL and repository-root startup step', () => {
    const { reason } = loadFailureReason('http://localhost:8080');
    assert.equal(
        reason(new Error('ไม่สามารถเชื่อมต่อ C++ Backend (http://localhost:8080): Failed to fetch')),
        'ไม่สามารถเชื่อมต่อ backend ที่ http://localhost:8080 ได้ กรุณาเริ่ม backend จาก repository root'
    );
});

test('HTTP 401 tells the user the session expired and to log in again', () => {
    const { reason } = loadFailureReason();
    const error = new Error('login required');
    error.status = 401;
    assert.equal(reason(error), 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
});

test('other failures show their original message and the form logs the original error', () => {
    const { reason, source } = loadFailureReason();
    const error = new Error('database write failed');
    assert.equal(reason(error), 'database write failed');
    assert.match(source, /console\.error\("\[Satisfaction\] Submission failed", submissionError\)/);
    assert.match(source, /บันทึกผลไม่สำเร็จ กรุณาลองอีกครั้ง/);
});
