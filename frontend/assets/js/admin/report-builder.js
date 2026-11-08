(function (root) {
    'use strict';

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    function formatNumber(num, decimals = 2) {
        if (num == null || isNaN(num)) return '-';
        return Number(num).toLocaleString('th-TH', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function buildReportHtml(data = {}, options = {}) {
        const section = options.section || 'satisfaction';
        const timestamp = data.timestamp || new Date().toLocaleString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const filters = data.filters || {};
        const filterSystem = filters.system || 'ทุกระบบ IT';
        const filterPeriod = filters.period || 'ทั้งหมด';
        const filterRole = filters.role || '';
        const filterVersion = filters.version || '';
        const dataSource = data.source || 'ระบบประเมิน';

        // Check if there is data
        const records = Array.isArray(data.records) ? data.records : [];
        const systems = Array.isArray(data.systems) ? data.systems : [];
        const hasSatisfactionData = records.length > 0 || (typeof data.totalEvaluations === 'number' && data.totalEvaluations > 0);
        const effectivenessRecords = Array.isArray(data.effectiveness?.records) ? data.effectiveness.records : [];
        const hasEffectivenessData = effectivenessRecords.length > 0 || (data.effectiveness?.summary?.records?.length > 0);

        let hasData = false;
        if (section === 'satisfaction') {
            hasData = hasSatisfactionData;
        } else if (section === 'effectiveness') {
            hasData = hasEffectivenessData;
        } else {
            hasData = hasSatisfactionData || hasEffectivenessData;
        }

        const reportTitle = section === 'effectiveness'
            ? 'รายงานผลการประเมินประสิทธิผลระบบ IT'
            : section === 'both'
                ? 'รายงานผลการประเมินประสิทธิภาพและประสิทธิผลระบบ IT'
                : 'รายงานสรุปผลการประเมิน IT';

        // CSS Styles
        const inlineStyles = `
        @page {
            size: A4 portrait;
            margin: 15mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body {
            font-family: 'Kanit', 'Sarabun', 'Noto Sans Thai', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
        }
        .report-header {
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 12px;
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .report-title-group h1 {
            margin: 0 0 4px 0;
            font-size: 18pt;
            color: #1e3a8a;
            font-weight: 700;
            line-height: 1.3;
        }
        .report-title-group p {
            margin: 2px 0;
            color: #475569;
            font-size: 10pt;
        }
        .report-meta-group {
            text-align: right;
            font-size: 9.5pt;
            color: #475569;
        }
        .status-badge {
            display: inline-block;
            background: #f1f5f9;
            color: #1e3a8a;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 9pt;
            font-weight: 600;
            border: 1px solid #cbd5e1;
            margin-bottom: 6px;
        }
        .badge-live {
            background: #ecfdf5;
            color: #065f46;
            border-color: #a7f3d0;
        }
        .badge-empty {
            background: #fef2f2;
            color: #991b1b;
            border-color: #fecaca;
        }
        .filter-tags {
            margin: 10px 0 16px;
            padding: 8px 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 9.5pt;
            color: #334155;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }
        .filter-item strong {
            color: #0f172a;
        }
        h2, h3, h4 {
            color: #1e3a8a;
            break-after: avoid;
            page-break-after: avoid;
            margin-top: 18px;
            margin-bottom: 8px;
        }
        h2 {
            font-size: 13pt;
            border-left: 4px solid #1e3a8a;
            padding-left: 8px;
        }
        h3 {
            font-size: 11.5pt;
        }
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 14px;
        }
        .kpi-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
            background: #f8fafc;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .kpi-card .kpi-label {
            font-size: 9pt;
            color: #64748b;
            margin-bottom: 4px;
            font-weight: 500;
        }
        .kpi-card .kpi-value {
            font-size: 16pt;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.2;
        }
        .kpi-card .kpi-sub {
            font-size: 8.5pt;
            color: #64748b;
            margin-top: 2px;
        }
        .executive-summary-text {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-left: 3px solid #3b82f6;
            padding: 10px 14px;
            border-radius: 4px;
            font-size: 10pt;
            color: #334155;
            line-height: 1.6;
            margin-bottom: 16px;
        }
        .executive-summary-text p {
            margin: 4px 0;
        }
        .chart-block {
            margin: 16px 0;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px;
            background: #ffffff;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .chart-block h3 {
            margin-top: 0;
            margin-bottom: 8px;
        }
        .chart-figure {
            margin: 0;
            text-align: center;
        }
        .chart-figure img {
            max-width: 100%;
            height: auto;
            max-height: 240px;
            object-fit: contain;
        }
        .chart-caption {
            font-size: 9pt;
            color: #64748b;
            margin-top: 6px;
            text-align: center;
            font-style: italic;
        }
        .table-wrapper {
            margin: 14px 0;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
            text-align: left;
        }
        thead {
            display: table-header-group;
            background-color: #f1f5f9;
        }
        th {
            padding: 8px 10px;
            border-bottom: 1px solid #cbd5e1;
            color: #334155;
            font-weight: 600;
        }
        td {
            padding: 7px 10px;
            border-bottom: 1px solid #f1f5f9;
            color: #1e293b;
        }
        tr {
            break-inside: avoid;
            page-break-inside: avoid;
        }
        tr:nth-child(even) td {
            background-color: #fafafa;
        }
        .text-center {
            text-align: center;
        }
        .text-right {
            text-align: right;
        }
        .badge-score {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8.5pt;
            font-weight: 600;
        }
        .badge-good {
            background: #dcfce7;
            color: #166534;
        }
        .badge-neutral {
            background: #fef9c3;
            color: #854d0e;
        }
        .badge-bad {
            background: #fee2e2;
            color: #991b1b;
        }
        .badge-none {
            background: #f1f5f9;
            color: #64748b;
        }
        .criteria-footnote {
            margin-top: 14px;
            padding: 8px 12px;
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 4px;
            font-size: 9pt;
            color: #475569;
            line-height: 1.4;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #64748b;
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
            margin: 24px 0;
            background: #fafafa;
        }
        .empty-state h2 {
            font-size: 14pt;
            color: #1e293b;
            margin: 0 0 8px 0;
            border-left: none;
            padding-left: 0;
        }
        .empty-state p {
            margin: 4px 0;
            font-size: 10.5pt;
        }
        .report-footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            font-size: 8.5pt;
            color: #94a3b8;
            break-inside: avoid;
            page-break-inside: avoid;
        }
        `;

        // If no data, return empty-state HTML
        if (!hasData) {
            return `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(reportTitle)} - ${escapeHtml(timestamp)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>${inlineStyles}</style>
</head>
<body>
    <header class="report-header">
        <div class="report-title-group">
            <h1>${escapeHtml(reportTitle)}</h1>
            <p>คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร</p>
        </div>
        <div class="report-meta-group">
            <span class="status-badge badge-empty">ไม่มีข้อมูลการประเมิน</span>
            <div>วันที่ออกรายงาน: ${escapeHtml(timestamp)}</div>
            <div>แหล่งข้อมูล: ${escapeHtml(dataSource)}</div>
        </div>
    </header>

    <div class="filter-tags">
        <div class="filter-item">ระบบ IT: <strong>${escapeHtml(filterSystem)}</strong></div>
        <div class="filter-item">ช่วงเวลา: <strong>${escapeHtml(filterPeriod)}</strong></div>
        ${filterRole ? `<div class="filter-item">บทบาท: <strong>${escapeHtml(filterRole)}</strong></div>` : ''}
        ${filterVersion ? `<div class="filter-item">เวอร์ชัน: <strong>${escapeHtml(filterVersion)}</strong></div>` : ''}
    </div>

    <div class="empty-state">
        <h2>ไม่พบข้อมูลการประเมินในระบบ</h2>
        <p>ยังไม่มีการบันทึกผลการประเมินสำหรับระบบสารสนเทศตามเงื่อนไขตัวกรองที่กำหนด</p>
        <p style="font-size: 9pt; color: #94a3b8; margin-top: 8px;">กรุณาเลือกเงื่อนไขตัวกรองใหม่ หรือบันทึกข้อมูลการประเมินเข้าสู่ระบบก่อนทำการออกรายงาน</p>
    </div>

    <footer class="report-footer">
        <div>ระบบประเมิน IT คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร</div>
        <div>รายงานสารสนเทศเพื่อการบริหาร</div>
    </footer>
</body>
</html>`;
        }

        // Compute KPIs & Data for satisfaction
        const totalSys = data.totalSystems != null ? data.totalSystems : systems.length;
        const totalUsers = data.totalUsers != null ? data.totalUsers : 0;
        const totalEvals = data.totalEvaluations != null ? data.totalEvaluations : records.length;
        const overallAvg = typeof data.overallSatisfactionAvg === 'number' && !isNaN(data.overallSatisfactionAvg)
            ? data.overallSatisfactionAvg
            : null;
        const avgDisplay = overallAvg != null ? overallAvg.toFixed(2) : '-';

        let satLevelText = 'ยังไม่มีผลการประเมิน';
        if (overallAvg != null) {
            if (overallAvg >= 3.5) satLevelText = 'อยู่ในเกณฑ์ระดับพึงพอใจสูง';
            else if (overallAvg >= 2.5) satLevelText = 'อยู่ในเกณฑ์ระดับปานกลาง';
            else satLevelText = 'อยู่ในเกณฑ์ควรปรับปรุงแก้ไข';
        }

        // Table Rows & Summary
        const systemStats = Array.isArray(data.systemStats) ? data.systemStats : [];
        let evaluatedSystemsCount = 0;
        let topSystemName = '-';
        let topSystemScore = -1;

        const tableRowsHtml = systems.map((sys, idx) => {
            const stat = systemStats.find(s => s.id === sys.id);
            const userCount = stat ? (stat.evaluatorCount || 0) : 0;
            const evalCount = stat ? (stat.evaluationCount || 0) : 0;
            const avg = stat && typeof stat.averageSatisfaction === 'number' && !isNaN(stat.averageSatisfaction)
                ? stat.averageSatisfaction
                : null;

            if (avg != null) {
                evaluatedSystemsCount++;
                if (avg > topSystemScore) {
                    topSystemScore = avg;
                    topSystemName = sys.name;
                }
            }

            let badgeHtml = '<span class="badge-score badge-none">ยังไม่มีผล</span>';
            if (avg != null) {
                if (avg >= 3.5) badgeHtml = `<span class="badge-score badge-good">${avg.toFixed(2)} · พึงพอใจสูง</span>`;
                else if (avg >= 2.5) badgeHtml = `<span class="badge-score badge-neutral">${avg.toFixed(2)} · ปานกลาง</span>`;
                else badgeHtml = `<span class="badge-score badge-bad">${avg.toFixed(2)} · ควรปรับปรุง</span>`;
            }

            return `<tr>
                <td class="text-center">${idx + 1}</td>
                <td><strong>${escapeHtml(sys.id)}</strong></td>
                <td>${escapeHtml(sys.name)}</td>
                <td class="text-center">${userCount} คน (${evalCount} ชุด)</td>
                <td class="text-center">${avg != null ? avg.toFixed(2) : '-'}</td>
                <td class="text-center">${badgeHtml}</td>
            </tr>`;
        }).join('');

        // Executive Narrative
        const narrativeLines = [];
        narrativeLines.push(`จากการประเมินระบบสารสนเทศทั้งหมด ${totalSys} ระบบ มีผู้ร่วมประเมินทั้งสิ้น ${totalUsers} คน คิดเป็นข้อมูลการประเมินที่สมบูรณ์ ${totalEvals} ชุดข้อมูล`);
        if (overallAvg != null) {
            narrativeLines.push(`ผลการประเมินความพึงพอใจโดยรวมเฉลี่ยอยู่ที่ ${avgDisplay} จาก 5 คะแนน (${satLevelText})`);
            if (evaluatedSystemsCount > 0 && topSystemScore >= 0) {
                narrativeLines.push(`ระบบที่ได้รับคะแนนความพึงพอใจเฉลี่ยสูงสุดได้แก่ ${escapeHtml(topSystemName)} (${topSystemScore.toFixed(2)}/5) โดยมีระบบที่ได้รับการประเมินแล้ว ${evaluatedSystemsCount} จาก ${totalSys} ระบบ`);
            }
        } else {
            narrativeLines.push('ยังไม่มีข้อมูลคะแนนประเมินความพึงพอใจที่สามารถคำนวณค่าเฉลี่ยรวมได้');
        }

        // Charts HTML
        let chartsHtml = '';
        const chartImages = data.chartImages || {};
        if (chartImages.ratingCounts) {
            chartsHtml += `
            <div class="chart-block">
                <h3>การกระจายตัวของระดับความพึงพอใจ (1–5 ดาว)</h3>
                <figure class="chart-figure">
                    <img src="${escapeHtml(chartImages.ratingCounts)}" alt="กราฟการกระจายตัวของระดับความพึงพอใจ" />
                    <figcaption class="chart-caption">รูปที่ 1: แผนภูมิแท่งแสดงสัดส่วนจำนวนคำตอบจำแนกตามระดับคะแนน 1 ถึง 5 ดาว</figcaption>
                </figure>
            </div>`;
        }

        if (chartImages.trend) {
            chartsHtml += `
            <div class="chart-block">
                <h3>แนวโน้มความพึงพอใจย้อนหลัง</h3>
                <figure class="chart-figure">
                    <img src="${escapeHtml(chartImages.trend)}" alt="กราฟแนวโน้มความพึงพอใจย้อนหลัง" />
                    <figcaption class="chart-caption">รูปที่ 2: แผนภูมิเส้นแสดงแนวโน้มการเปลี่ยนแปลงของคะแนนความพึงพอใจเฉลี่ยตามช่วงเวลา</figcaption>
                </figure>
            </div>`;
        }

        // Effectiveness Section (if section === 'both' or 'effectiveness')
        let effectivenessHtml = '';
        if (section === 'both' || section === 'effectiveness') {
            const effSummary = data.effectiveness?.summary;
            const effRecords = data.effectiveness?.records || [];
            if (effSummary || effRecords.length > 0) {
                const effSysCount = effSummary ? effSummary.systems : 0;
                const effRecordCount = effSummary ? effSummary.records.length : effRecords.length;
                effectivenessHtml = `
                <h2>ผลการประเมินด้านประสิทธิภาพและประสิทธิผล (Effectiveness)</h2>
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-label">ระบบ IT ที่มีผลประเมิน</div>
                        <div class="kpi-value">${effSysCount}</div>
                        <div class="kpi-sub">ระบบ</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">ชุดข้อมูลประเมิน</div>
                        <div class="kpi-value">${effRecordCount}</div>
                        <div class="kpi-sub">รายการ</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">ตัวชี้วัดที่ประเมิน</div>
                        <div class="kpi-value">${effSummary?.groups?.length || 0}</div>
                        <div class="kpi-sub">รายการตัวชี้วัด</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">ข้อมูลไม่เพียงพอ</div>
                        <div class="kpi-value">${effSummary?.unavailable || 0}</div>
                        <div class="kpi-sub">จุดวัด</div>
                    </div>
                </div>`;
            }
        }

        return `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(reportTitle)} - ${escapeHtml(timestamp)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>${inlineStyles}</style>
</head>
<body>
    <header class="report-header">
        <div class="report-title-group">
            <h1>${escapeHtml(reportTitle)}</h1>
            <p>คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร</p>
        </div>
        <div class="report-meta-group">
            <span class="status-badge badge-live">ชุดข้อมูลการประเมินจริง</span>
            <div>วันที่ออกรายงาน: ${escapeHtml(timestamp)}</div>
            <div>แหล่งข้อมูล: ${escapeHtml(dataSource)}</div>
        </div>
    </header>

    <div class="filter-tags">
        <div class="filter-item">ระบบ IT: <strong>${escapeHtml(filterSystem)}</strong></div>
        <div class="filter-item">ช่วงเวลา: <strong>${escapeHtml(filterPeriod)}</strong></div>
        ${filterRole ? `<div class="filter-item">บทบาท: <strong>${escapeHtml(filterRole)}</strong></div>` : ''}
        ${filterVersion ? `<div class="filter-item">เวอร์ชัน: <strong>${escapeHtml(filterVersion)}</strong></div>` : ''}
    </div>

    <h2>บทสรุปผู้บริหาร (Executive Summary)</h2>
    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-label">ระบบสารสนเทศทั้งหมด</div>
            <div class="kpi-value">${totalSys}</div>
            <div class="kpi-sub">ระบบที่เปิดประเมิน</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">จำนวนผู้ร่วมประเมิน</div>
            <div class="kpi-value">${totalUsers}</div>
            <div class="kpi-sub">คน (ไม่ซ้ำ)</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">ชุดข้อมูลการประเมิน</div>
            <div class="kpi-value">${totalEvals}</div>
            <div class="kpi-sub">ชุดข้อมูล</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">ความพึงพอใจเฉลี่ย</div>
            <div class="kpi-value">${avgDisplay}</div>
            <div class="kpi-sub">จากเต็ม 5.00 คะแนน</div>
        </div>
    </div>

    <div class="executive-summary-text">
        ${narrativeLines.map(line => `<p>${line}</p>`).join('')}
    </div>

    ${chartsHtml}

    ${section !== 'effectiveness' ? `
    <h2>ตารางสรุปผลการประเมินความพึงพอใจรายระบบ</h2>
    <div class="table-wrapper">
        <table>
            <thead>
                <tr>
                    <th class="text-center" style="width: 48px;">ลำดับ</th>
                    <th style="width: 100px;">รหัสระบบ</th>
                    <th>ชื่อระบบสารสนเทศ</th>
                    <th class="text-center" style="width: 140px;">จำนวนผู้ประเมิน</th>
                    <th class="text-center" style="width: 110px;">ความพึงพอใจ / 5</th>
                    <th class="text-center" style="width: 140px;">ระดับความพึงพอใจ</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHtml}
            </tbody>
        </table>
    </div>

    <div class="criteria-footnote">
        <strong>เกณฑ์การแปลผลคะแนนความพึงพอใจ:</strong>
        คะแนนเฉลี่ย 3.50 – 5.00 = ระดับพึงพอใจสูง |
        คะแนนเฉลี่ย 2.50 – 3.49 = ระดับปานกลาง |
        คะแนนเฉลี่ยต่ำกว่า 2.50 = ควรปรับปรุงแก้ไข
    </div>
    ` : ''}

    ${effectivenessHtml}

    <footer class="report-footer">
        <div>ระบบประเมิน IT คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร</div>
        <div>รายงานสารสนเทศเพื่อการบริหาร</div>
    </footer>
</body>
</html>`;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { buildReportHtml, escapeHtml };
    }
    if (root) {
        root.ReportBuilder = { buildReportHtml, escapeHtml };
    }
})(typeof window !== 'undefined' ? window : globalThis);
