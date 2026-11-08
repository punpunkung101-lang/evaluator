const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReportHtml, escapeHtml } = require('./report-builder.js');

test('Report builder: includes correct report title and organizational headers', () => {
    const data = {
        totalSystems: 3,
        totalUsers: 15,
        totalEvaluations: 30,
        overallSatisfactionAvg: 4.25,
        systems: [
            { id: 'SYS-01', name: 'ระบบสารสนเทศ 1' },
            { id: 'SYS-02', name: 'ระบบสารสนเทศ 2' }
        ],
        records: [{ id: 'REC-01' }],
        systemStats: [
            { id: 'SYS-01', evaluatorCount: 10, evaluationCount: 20, averageSatisfaction: 4.5 },
            { id: 'SYS-02', evaluatorCount: 5, evaluationCount: 10, averageSatisfaction: 4.0 }
        ]
    };

    const html = buildReportHtml(data, { section: 'satisfaction' });
    assert.match(html, /รายงานสรุปผลการประเมิน IT/);
    assert.match(html, /คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร/);
    assert.match(html, /บทสรุปผู้บริหาร/);
});

test('Report builder: KPI values in HTML match input data', () => {
    const data = {
        totalSystems: 7,
        totalUsers: 42,
        totalEvaluations: 85,
        overallSatisfactionAvg: 4.38,
        systems: [{ id: 'SYS-01', name: 'ระบบทดสอบ' }],
        records: [{ id: 'r1' }]
    };

    const html = buildReportHtml(data, { section: 'satisfaction' });
    assert.match(html, />7<\/div>/);
    assert.match(html, />42<\/div>/);
    assert.match(html, />85<\/div>/);
    assert.match(html, />4.38<\/div>/);
});

test('Report builder: table row count matches input systems', () => {
    const data = {
        systems: [
            { id: 'SYS-01', name: 'ระบบ A' },
            { id: 'SYS-02', name: 'ระบบ B' },
            { id: 'SYS-03', name: 'ระบบ C' },
            { id: 'SYS-04', name: 'ระบบ D' }
        ],
        records: [{ id: 'r1' }],
        systemStats: [
            { id: 'SYS-01', evaluatorCount: 1, evaluationCount: 1, averageSatisfaction: 4.0 },
            { id: 'SYS-02', evaluatorCount: 2, evaluationCount: 2, averageSatisfaction: 3.5 },
            { id: 'SYS-03', evaluatorCount: 3, evaluationCount: 3, averageSatisfaction: 2.0 },
            { id: 'SYS-04', evaluatorCount: 4, evaluationCount: 4, averageSatisfaction: 4.8 }
        ]
    };

    const html = buildReportHtml(data, { section: 'satisfaction' });
    // Match each system id in strong tag within table
    for (const sys of data.systems) {
        assert.match(html, new RegExp(`<strong>${sys.id}</strong>`));
        assert.match(html, new RegExp(`<td>${sys.name}</td>`));
    }
    // Count tbody tr rows
    const tbodyMatches = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
    assert.ok(tbodyMatches);
    const rowMatches = tbodyMatches[1].match(/<tr[\s\S]*?<\/tr>/g);
    assert.equal(rowMatches.length, 4);
});

test('Report builder: empty input yields empty-state without table or empty chart frames', () => {
    const emptyData = {
        systems: [],
        records: [],
        totalEvaluations: 0
    };

    const html = buildReportHtml(emptyData, { section: 'satisfaction' });
    assert.match(html, /ไม่พบข้อมูลการประเมินในระบบ/);
    assert.match(html, /ไม่มีข้อมูลการประเมิน/);

    // Must NOT contain table, thead, tbody, or chart image / empty chart frame in body
    const bodyHtml = html.slice(html.indexOf('<body>'));
    assert.doesNotMatch(bodyHtml, /<table/i);
    assert.doesNotMatch(bodyHtml, /<tbody/i);
    assert.doesNotMatch(bodyHtml, /<img/i);
    assert.doesNotMatch(bodyHtml, /chart-block/i);
});

test('Report builder: strings with <script> and malicious content are properly escaped', () => {
    const maliciousData = {
        systems: [
            { id: '<script>alert("XSS")</script>', name: '<b onmouseover="alert(1)">ระบบเสี่ยง</b>' }
        ],
        records: [{ id: 'r1' }],
        filters: {
            system: '<img src=x onerror=alert(1)>',
            period: '"><script>alert(2)</script>'
        },
        source: '<script>evil()</script>'
    };

    const html = buildReportHtml(maliciousData, { section: 'satisfaction' });
    assert.doesNotMatch(html, /<script>/i);
    assert.doesNotMatch(html, /<b onmouseover=/i);
    assert.doesNotMatch(html, /<img src=x onerror=/i);
    assert.match(html, /&lt;script&gt;alert\(&quot;XSS&quot;\)&lt;\/script&gt;/);
    assert.match(html, /&lt;b onmouseover=&quot;alert\(1\)&quot;&gt;ระบบเสี่ยง&lt;\/b&gt;/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('Report builder: supports effectiveness and both sections', () => {
    const data = {
        systems: [{ id: 'SYS-01', name: 'ระบบ A' }],
        records: [{ id: 'r1' }],
        effectiveness: {
            records: [{ id: 'eff-1' }],
            summary: {
                systems: 1,
                records: [{ id: 'eff-1' }],
                groups: [{ count: 1 }],
                unavailable: 0
            }
        }
    };

    const effHtml = buildReportHtml(data, { section: 'effectiveness' });
    assert.match(effHtml, /รายงานผลการประเมินประสิทธิผลระบบ IT/);

    const bothHtml = buildReportHtml(data, { section: 'both' });
    assert.match(bothHtml, /รายงานผลการประเมินประสิทธิภาพและประสิทธิผลระบบ IT/);
});
