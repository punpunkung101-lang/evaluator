/**
 * IT Evaluator - Institutional Admin Dashboard Logic
 * Faculty of Allied Health Sciences, Naresuan University
 * 
 * Features:
 * - Real User JSON Ingestion (via EvaluationAPI / Supabase / Backend / Browser Storage)
 * - Dynamic Aggregations & Calculations (Zero Mock Datasets)
 * - Clean Empty & Error State Handling
 * - Professional & Accessible Chart.js Visualizations (Navy Slate Palette)
 * - Standalone Print-Ready HTML Export
 * - Multi-page Browser-Printable PDF Export with auto-pagination
 * - 100% Zero-Emoji Architecture
 */

const dashboardScriptUrl = document.currentScript?.src;

document.addEventListener("DOMContentLoaded", async () => {
    try { await window.AdminGuard.ready; }
    catch (_) { return; }

    // ==========================================
    // 1. DATA SOURCES & SYSTEMS DEFINITION
    // ==========================================

    function getCurrentSystems() {
        return window.AssessmentCatalog ? window.AssessmentCatalog.getSystems() : (window.systems || []);
    }

    let systems = getCurrentSystems();

    const questionNames = [
        "ความรวดเร็ว",
        "ความสะดวก",
        "ขั้นตอนกระชับ",
        "ความถูกต้อง",
        "ข้อผิดพลาดน้อย",
        "ใช้กระดาษน้อย",
        "ติดตามงานง่าย",
        "เข้าถึงข้อมูลง่าย",
        "บรรลุวัตถุประสงค์",
        "ประสิทธิภาพโดยรวม"
    ];

    // Institutional Academic Color Palette (Navy, Slate, Emerald, Gold)
    const colorPrimary = "#1e3a8a";        // Corporate Deep Navy
    const colorPrimaryLight = "#eff6ff";
    const colorBefore = "#94a3b8";         // Neutral Slate (Before implementation)
    const colorAfter = "#1e3a8a";          // Deep Navy (After implementation)
    const colorAccent = "#0284c7";         // Professional Blue
    const colorMuted = "#64748b";
    const colorGrid = "#f1f5f9";

    if (typeof Chart !== "undefined") {
        Chart.defaults.color = colorMuted;
        Chart.defaults.font.family = '"Kanit", sans-serif';
    }

    const charts = {};

    function destroyChart(id) {
        if (charts[id]) {
            charts[id].destroy();
            delete charts[id];
        }
    }

    function drawChart(id, config) {
        const canvas = document.getElementById(id);
        if (!canvas || typeof Chart === "undefined") return;

        destroyChart(id);
        charts[id] = new Chart(canvas, config);
    }

    function applyTrendTheme() {
        const chart = charts.satisfactionTrendChart;
        if (!chart) return;

        const dark = document.documentElement.dataset.theme === "dark";
        const skyBlue = "#38BDF8";
        const dataset = chart.data.datasets[0];
        dataset.borderColor = dark ? skyBlue : colorPrimary;
        dataset.pointBackgroundColor = dataset.borderColor;
        dataset.backgroundColor = dark ? "rgba(56, 189, 248, 0.12)" : "rgba(30, 58, 138, 0.08)";

        const { scales, plugins } = chart.options;
        plugins.legend.labels.color = dark ? skyBlue : "#334155";
        scales.x.ticks.color = dark ? "#CBD5E1" : colorMuted;
        scales.y.ticks.color = scales.x.ticks.color;
        scales.x.grid.display = dark;
        scales.x.grid.color = dark ? "#334155" : colorGrid;
        scales.y.grid.color = scales.x.grid.color;
        chart.update("none");
    }

    new MutationObserver(applyTrendTheme).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"]
    });

    function standardChartOptions(max = 5) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        boxWidth: 12,
                        padding: 12,
                        color: "#334155",
                        font: { size: 12, family: '"Kanit", sans-serif' }
                    }
                },
                tooltip: {
                    backgroundColor: "#0f172a",
                    padding: 10,
                    cornerRadius: 6,
                    titleFont: { family: '"Kanit", sans-serif', weight: "600" },
                    bodyFont: { family: '"Kanit", sans-serif' }
                }
            },
            scales: {
                x: {
                    ticks: { color: colorMuted, font: { size: 11, family: '"Kanit", sans-serif' } },
                    grid: { display: false }
                },
                y: {
                    min: 0,
                    max: max,
                    ticks: {
                        color: colorMuted,
                        stepSize: 1,
                        font: { size: 11, family: '"Kanit", sans-serif' }
                    },
                    grid: { color: colorGrid }
                }
            }
        };
    }

    // ==========================================
    // 2. STATE & REAL DATA STORAGE
    // ==========================================

    let rawEvaluations = [];
    let activeDataSource = "loading";
    let dataFetchError = null;

    // Elements
    const dataStatusBadge = document.getElementById("dataStatusBadge");
    const stateBanner = document.getElementById("stateBanner");
    const stateBannerMessage = document.getElementById("stateBannerMessage");
    const dismissBannerBtn = document.getElementById("dismissBannerBtn");

    const roleFilter = document.getElementById("userTypeFilter");
    const systemFilter = document.getElementById("systemFilter");
    const periodFilter = document.getElementById("periodFilter");
    const tableBody = document.getElementById("systemsTableBody");

    // ==========================================
    // 3. STATISTICAL HELPERS
    // ==========================================

    const isRating = value => Number.isInteger(value) && value >= 1 && value <= 5;

    function average(values) {
        if (!Array.isArray(values)) return null;
        const valid = values.filter(v => typeof v === "number" && Number.isFinite(v));
        if (valid.length === 0) return null;
        return valid.reduce((sum, v) => sum + v, 0) / valid.length;
    }

    function formatScore(value) {
        return value === null || value === undefined ? "-" : value.toFixed(2);
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function getMonthKey(dateStr) {
        if (!dateStr) return "";
        return String(dateStr).slice(0, 7);
    }

    function getYearKey(dateStr) {
        if (!dateStr) return "";
        return String(dateStr).slice(0, 4);
    }

    // ==========================================
    // 4. DATA INGESTION ENGINE
    // ==========================================

    async function loadData() {
        dataFetchError = null;

        if (typeof EvaluationAPI === "undefined") {
            dataFetchError = "โมดูล EvaluationAPI ไม่พร้อมใช้งาน";
            activeDataSource = "error";
            updateBadge();
            updateDashboard();
            return;
        }

        const result = await EvaluationAPI.getEvaluations();

        if (result.success) {
            rawEvaluations = result.data || [];
            activeDataSource = result.source;
        } else {
            rawEvaluations = [];
            dataFetchError = result.error || "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล";
            activeDataSource = "error";
        }

        updateBadge();
        updateDashboard();
    }

    function updateBadge() {
        if (!dataStatusBadge) return;

        if (activeDataSource === "error") {
            dataStatusBadge.className = "data-badge error";
            dataStatusBadge.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล
            `;
            showStateBanner("error", dataFetchError || "ไม่สามารถเชื่อมต่อแหล่งข้อมูลภายนอกได้");
        } else if (rawEvaluations.length === 0) {
            dataStatusBadge.className = "data-badge";
            dataStatusBadge.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                ไม่มีข้อมูลการประเมินในระบบ
            `;
            hideStateBanner();
        } else {
            dataStatusBadge.className = "data-badge live";
            const sourceLabel = activeDataSource === "supabase" ? "Supabase Cloud"
                : activeDataSource === "backend" ? "Backend REST API"
                : "ข้อมูลผู้ใช้จัดเก็บถาวร";
            dataStatusBadge.innerHTML = `
                <span class="status-indicator"></span>
                <span>ชุดข้อมูลจริง (${sourceLabel}: ${rawEvaluations.length} รายการ)</span>
            `;
            hideStateBanner();
        }
    }

    function showStateBanner(type, message) {
        if (!stateBanner) return;
        stateBanner.className = `state-banner ${type}`;
        stateBannerMessage.textContent = message;
        stateBanner.style.display = "flex";
    }

    function hideStateBanner() {
        if (stateBanner) stateBanner.style.display = "none";
    }

    if (dismissBannerBtn) {
        dismissBannerBtn.addEventListener("click", hideStateBanner);
    }

    // ==========================================
    // 5. UPDATE DASHBOARD & CALCULATIONS
    // ==========================================

    function updateDashboard() {
        const selectedRole = roleFilter?.value || "all";
        const selectedPeriod = periodFilter?.value || "all";

        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);
        const currentYear = today.toISOString().slice(0, 4);

        // All Systems
        const selectedSystem = systemFilter.value;
        systemFilter.replaceChildren(new Option("ทุกระบบ IT", ""), ...systems.map(system => new Option(system.name, system.id)));
        systemFilter.value = systems.some(system => system.id === selectedSystem) ? selectedSystem : "";
        const visibleSystems = systems.filter(system => !systemFilter.value || system.id === systemFilter.value);
        const visibleSystemIds = new Set(visibleSystems.map(s => s.id));

        // Filter Records
        const records = rawEvaluations.filter(record => {
            const matchSystem = visibleSystemIds.has(record.systemId);
            const matchRole = selectedRole === "all" || record.userRole === selectedRole;

            let matchPeriod = true;
            if (selectedPeriod === "month") {
                matchPeriod = getMonthKey(record.submittedAt) === currentMonth;
            } else if (selectedPeriod === "year") {
                matchPeriod = getYearKey(record.submittedAt) === currentYear;
            }

            return matchSystem && matchRole && matchPeriod && record.satisfactionAnswers.some(isRating);
        });

        // 1. Summary Metrics
        const uniqueEvaluators = new Set(
            records.map(r => r.evaluatorId || r.evaluatorName)
        );

        const allSatisfactionScores = records
            .map(r => r.satisfactionAverage ?? average(r.satisfactionAnswers))
            .filter(v => typeof v === "number" && !isNaN(v));

        const overallSatisfactionAvg = average(allSatisfactionScores);
        const hasRecords = records.length > 0;

        const evaluatedSystemIds = new Set(records.map(r => r.systemId));
        const evaluatedCount = visibleSystems.filter(s => evaluatedSystemIds.has(s.id)).length;
        const pendingCount = visibleSystems.length - evaluatedCount;

        // Section Summary Line (Real Data)
        const satSummary = document.getElementById("satSummaryLine");
        if (satSummary) {
            satSummary.textContent = hasRecords
                ? `ประเมินแล้ว ${evaluatedCount} จาก ${visibleSystems.length} ระบบ · คะแนนเฉลี่ย ${overallSatisfactionAvg !== null ? overallSatisfactionAvg.toFixed(2) : "-"}/5 จากผู้ประเมิน ${uniqueEvaluators.size} คน (${records.length} ชุดข้อมูล)`
                : `ยังไม่มีชุดข้อมูลประเมินความพึงพอใจในระบบ (${visibleSystems.length} ระบบที่เปิดให้ประเมิน)`;
        }

        setText("totalSystems", visibleSystems.length);
        setText("totalUsers", uniqueEvaluators.size);
        setText("totalEvaluations", records.length);

        if (overallSatisfactionAvg !== null) {
            setText("averageSatisfaction", overallSatisfactionAvg.toFixed(2));
            const maxLabel = document.getElementById("maxSatLabel");
            if (maxLabel) maxLabel.style.display = "inline";
        } else {
            setText("averageSatisfaction", "-");
            const maxLabel = document.getElementById("maxSatLabel");
            if (maxLabel) maxLabel.style.display = "none";
        }

        // 2. Rating Counts Chart (1-5 Stars with units and labels)
        const ratingCounts = [0, 0, 0, 0, 0];
        for (const record of records) {
            for (const score of record.satisfactionAnswers.filter(isRating)) ratingCounts[score - 1]++;
        }
        setText("ratingCounts", ratingCounts.map((count, index) => `${index + 1} ดาว: ${count}`).join(" · "));
        
        const ratingCard = document.getElementById("cardRatingCounts");
        if (ratingCard) ratingCard.style.display = hasRecords ? "block" : "none";

        if (hasRecords) {
            drawChart("ratingCountsChart", {
                type: "bar",
                data: {
                    labels: ["1 ดาว", "2 ดาว", "3 ดาว", "4 ดาว", "5 ดาว"],
                    datasets: [{
                        label: "จำนวนคำตอบ (ครั้ง)",
                        data: ratingCounts,
                        backgroundColor: "#1e3a8a",
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => `จำนวน ${ctx.raw} คำตอบ`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { font: { size: 12, family: '"Kanit", sans-serif' } },
                            grid: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0, font: { size: 12, family: '"Kanit", sans-serif' } },
                            grid: { color: colorGrid }
                        }
                    }
                }
            });
        }

        // 3. Evaluation Status Progress Bar (Clean Accessible Progress Bar)
        const coveragePercent = visibleSystems.length ? Math.round((evaluatedCount / visibleSystems.length) * 100) : 0;
        const progressFill = document.getElementById("coverageProgressFill");
        const progressBar = document.getElementById("coverageProgressBar");
        if (progressFill) progressFill.style.width = `${coveragePercent}%`;
        if (progressBar) progressBar.setAttribute("aria-valuenow", coveragePercent);
        setText("coveragePercent", `${coveragePercent}%`);
        setText("coverageDetailEvaluated", `ประเมินแล้ว ${evaluatedCount} จาก ${visibleSystems.length} ระบบ`);
        setText("coverageDetailPending", `ยังไม่มีการประเมิน ${pendingCount} ระบบ`);

        // Hidden doughnut kept for backward safety
        const statusCanvas = document.getElementById("evaluationStatusChart");
        if (statusCanvas) {
            drawChart("evaluationStatusChart", {
                type: "doughnut",
                data: {
                    labels: ["มีผลการประเมิน", "ยังไม่มีการประเมิน"],
                    datasets: [{ data: [evaluatedCount, pendingCount], backgroundColor: [colorPrimary, "#e2e8f0"] }]
                },
                options: { responsive: false, plugins: { legend: { display: false } } }
            });
        }

        // 4. Satisfaction Breakdown (3 rows with real counts)
        if (!hasRecords || allSatisfactionScores.length === 0) {
            setText("happyPercent", "0%");
            setText("neutralPercent", "0%");
            setText("unhappyPercent", "0%");
            setText("happyCount", "0 จาก 0 ชุดข้อมูล");
            setText("neutralCount", "0 จาก 0 ชุดข้อมูล");
            setText("unhappyCount", "0 จาก 0 ชุดข้อมูล");
        } else {
            let happy = 0, neutral = 0, unhappy = 0;
            allSatisfactionScores.forEach(score => {
                if (score >= 3.5) happy++;
                else if (score >= 2.5) neutral++;
                else unhappy++;
            });
            const total = allSatisfactionScores.length;
            setText("happyPercent", ((happy / total) * 100).toFixed(1) + "%");
            setText("neutralPercent", ((neutral / total) * 100).toFixed(1) + "%");
            setText("unhappyPercent", ((unhappy / total) * 100).toFixed(1) + "%");
            setText("happyCount", `${happy} จาก ${total} ชุดข้อมูล`);
            setText("neutralCount", `${neutral} จาก ${total} ชุดข้อมูล`);
            setText("unhappyCount", `${unhappy} จาก ${total} ชุดข้อมูล`);
        }

        // 5. Satisfaction Trend Chart (Hidden if no records)
        const trendCanvas = document.getElementById("satisfactionTrendChart");
        const trendEmpty = document.getElementById("trendEmpty");
        const trendCard = document.getElementById("cardSatisfactionTrend");

        if (!hasRecords) {
            if (trendCard) trendCard.style.display = "none";
            destroyChart("satisfactionTrendChart");
        } else {
            if (trendCard) trendCard.style.display = "block";
            if (trendCanvas) trendCanvas.style.display = "block";
            if (trendEmpty) trendEmpty.style.display = "none";

            const pastMonths = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
                return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0")].join("-");
            });

            const trendScores = pastMonths.map(m => {
                const mRecords = records.filter(r => getMonthKey(r.submittedAt) === m);
                return average(mRecords.map(r => r.satisfactionAverage ?? average(r.satisfactionAnswers)));
            });

            drawChart("satisfactionTrendChart", {
                type: "line",
                data: {
                    labels: pastMonths.map(m => {
                        const [y, mNum] = m.split("-").map(Number);
                        return new Date(y, mNum - 1, 1).toLocaleDateString("th-TH", {
                            month: "short",
                            year: "2-digit"
                        });
                    }),
                    datasets: [{
                        label: "คะแนนเฉลี่ยความพึงพอใจ",
                        data: trendScores,
                        borderColor: colorPrimary,
                        backgroundColor: "rgba(30, 58, 138, 0.08)",
                        tension: 0.3,
                        fill: true,
                        pointRadius: 4,
                        pointBackgroundColor: colorPrimary
                    }]
                },
                options: standardChartOptions(5)
            });
            applyTrendTheme();
        }

        // 7. System Table
        renderTable(visibleSystems, records);
    }


    function renderTable(visibleSystems, records) {
        if (!tableBody) return;
        tableBody.replaceChildren();

        if (visibleSystems.length === 0) {
            const row = document.createElement("tr");
            row.className = "table-empty-row";
            row.innerHTML = `<td colspan="6" style="text-align: center; padding: 24px;">ไม่พบระบบสารสนเทศตามเงื่อนไขที่เลือก</td>`;
            tableBody.appendChild(row);
            return;
        }

        visibleSystems.forEach((system, index) => {
            const sysRecords = records.filter(r => r.systemId === system.id);
            const satAvg = average(sysRecords.map(r => r.satisfactionAverage ?? average(r.satisfactionAnswers)));
            const uniqueSysUsers = new Set(sysRecords.map(r => r.evaluatorId || r.evaluatorName)).size;

            let statusBadge = '<span class="status-badge status-none">ยังไม่มีผลประเมิน</span>';
            if (satAvg !== null) {
                if (satAvg >= 3.5) statusBadge = `<span class="status-badge status-good">${formatScore(satAvg)} · พึงพอใจสูง</span>`;
                else if (satAvg >= 2.5) statusBadge = `<span class="status-badge status-neutral">${formatScore(satAvg)} · ปานกลาง</span>`;
                else statusBadge = `<span class="status-badge status-bad">${formatScore(satAvg)} · ควรปรับปรุง</span>`;
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="text-align: center;">${index + 1}</td>
                <td><strong>${system.id}</strong></td>
                <td>${system.name}</td>
                <td style="text-align: center;">${uniqueSysUsers} คน (${sysRecords.length} ชุด)</td>
                <td>${statusBadge}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="location.href='${window.EvaluatorRuntimeUrl.fromScript(`../../../admin/evaluation-detail.html?system=${encodeURIComponent(system.id)}`, dashboardScriptUrl)}'">
                        ดูรายละเอียด →
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Filter Listeners
    [roleFilter, periodFilter, systemFilter].forEach(el => {
        el?.addEventListener("change", updateDashboard);
    });

    // ==========================================
    // 6. JSON IMPORT MODAL HANDLERS
    // ==========================================

    const importJsonBtn = document.getElementById("importJsonBtn");
    const importModal = document.getElementById("importModal");
    const closeImportModal = document.getElementById("closeImportModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const fileDropzone = document.getElementById("fileDropzone");
    const jsonFileInput = document.getElementById("jsonFileInput");
    const clearDataBtn = document.getElementById("clearDataBtn");

    function openModal() {
        if (importModal) importModal.classList.add("open");
    }

    function closeModal() {
        if (importModal) importModal.classList.remove("open");
    }

    if (importJsonBtn) importJsonBtn.addEventListener("click", openModal);
    if (closeImportModal) closeImportModal.addEventListener("click", closeModal);
    if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

    if (fileDropzone && jsonFileInput) {
        fileDropzone.addEventListener("click", () => jsonFileInput.click());
        fileDropzone.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                jsonFileInput.click();
            }
        });

        fileDropzone.addEventListener("dragover", e => {
            e.preventDefault();
            fileDropzone.classList.add("dragover");
        });

        fileDropzone.addEventListener("dragleave", () => {
            fileDropzone.classList.remove("dragover");
        });

        fileDropzone.addEventListener("drop", e => {
            e.preventDefault();
            fileDropzone.classList.remove("dragover");
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileImport(file);
        });

        jsonFileInput.addEventListener("change", e => {
            const file = e.target.files?.[0];
            if (file) handleFileImport(file);
        });
    }

    async function handleFileImport(file) {
        if (!file.name.endsWith(".json")) {
            alert("กรุณาเลือกไฟล์ข้อมูลที่มีนามสกุล .json เท่านั้น");
            return;
        }

        const reader = new FileReader();
        reader.onload = async e => {
            const result = await EvaluationAPI.importEvaluationsJSON(e.target.result);
            if (result.success) {
                alert(`นำเข้าชุดข้อมูลสำเร็จ: เพิ่มรายการใหม่ ${result.count} รายการ (รวมข้อมูลในระบบทั้งหมด ${result.total} รายการ)`);
                closeModal();
                loadData();
            } else {
                alert(`เกิดข้อผิดพลาดในการประมวลผลไฟล์ JSON: ${result.error}`);
            }
        };
        reader.readAsText(file);
    }

    if (clearDataBtn) {
        clearDataBtn.addEventListener("click", async () => {
            if (confirm("ท่านต้องการล้างชุดข้อมูลการประเมินที่นำเข้าทั้งหมดใช่หรือไม่?")) {
                try {
                    await EvaluationAPI.clearEvaluations();
                    alert("ล้างชุดข้อมูลเรียบร้อยแล้ว");
                    closeModal();
                    await loadData();
                } catch (error) {
                    alert(`ล้างข้อมูลไม่สำเร็จ: ${error.message}`);
                }
            }
        });
    }

    // ==========================================
    // 7. EXPORT FUNCTIONALITY (HTML & PDF)
    // ==========================================

    const exportHtmlBtn = document.getElementById("exportHtmlBtn");
    const exportPdfBtn = document.getElementById("exportPdfBtn");

    function collectReportData() {
        const isEffectiveness = window.location.hash === "#quantitative-results";
        const visibleSystems = systems.filter(system => !systemFilter.value || system.id === systemFilter.value);
        const selectedRole = roleFilter?.value || "all";
        const selectedPeriod = periodFilter?.value || "all";
        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);
        const currentYear = today.toISOString().slice(0, 4);

        const records = rawEvaluations.filter(record => {
            const matchSystem = visibleSystems.some(s => s.id === record.systemId);
            const matchRole = selectedRole === "all" || record.userRole === selectedRole;
            let matchPeriod = true;
            if (selectedPeriod === "month") {
                matchPeriod = getMonthKey(record.submittedAt) === currentMonth;
            } else if (selectedPeriod === "year") {
                matchPeriod = getYearKey(record.submittedAt) === currentYear;
            }
            return matchSystem && matchRole && matchPeriod && record.satisfactionAnswers.some(isRating);
        });

        const uniqueEvaluators = new Set(records.map(r => r.evaluatorId || r.evaluatorName));
        const allSatisfactionScores = records
            .map(r => r.satisfactionAverage ?? average(r.satisfactionAnswers))
            .filter(v => typeof v === "number" && !isNaN(v));
        const overallSatisfactionAvg = average(allSatisfactionScores);

        const ratingCounts = [0, 0, 0, 0, 0];
        for (const record of records) {
            for (const score of record.satisfactionAnswers.filter(isRating)) ratingCounts[score - 1]++;
        }

        const chartImages = {};
        if (charts.ratingCountsChart?.toBase64Image) {
            try { chartImages.ratingCounts = charts.ratingCountsChart.toBase64Image(); } catch (e) {}
        }
        if (charts.satisfactionTrendChart?.toBase64Image) {
            try { chartImages.trend = charts.satisfactionTrendChart.toBase64Image(); } catch (e) {}
        }

        const systemStats = visibleSystems.map(system => {
            const sysRecords = records.filter(r => r.systemId === system.id);
            const satAvg = average(sysRecords.map(r => r.satisfactionAverage ?? average(r.satisfactionAnswers)));
            const userCount = new Set(sysRecords.map(r => r.evaluatorId || r.evaluatorName)).size;
            return {
                id: system.id,
                name: system.name,
                evaluatorCount: userCount,
                evaluationCount: sysRecords.length,
                averageSatisfaction: satAvg
            };
        });

        let effectiveness = null;
        if (window.Quantitative) {
            try {
                const qRecords = JSON.parse(localStorage.getItem(window.Quantitative.keys.records) || "[]");
                const qSys = document.getElementById("qd-system")?.value || "";
                const qVer = document.getElementById("qd-version")?.value || "";
                const summarizeFn = window.AdminResults?.summarize || (typeof summarize !== "undefined" ? summarize : null);
                if (summarizeFn) {
                    const summary = summarizeFn(qRecords, {
                        system: qSys
                    });
                    effectiveness = {
                        records: qRecords,
                        summary,
                        filters: { system: qSys, version: qVer }
                    };
                }
            } catch (e) {
                console.warn("Could not collect effectiveness data for report", e);
            }
        }

        const selectedSystemObj = systems.find(s => s.id === systemFilter.value);
        const systemFilterLabel = selectedSystemObj ? selectedSystemObj.name : "ทุกระบบ IT";
        const periodFilterLabel = periodFilter?.options[periodFilter.selectedIndex]?.text || "ทั้งหมด";
        const roleFilterLabel = roleFilter?.options[roleFilter.selectedIndex]?.text || "ทุกกลุ่มผู้ใช้";

        const sourceLabel = activeDataSource === "supabase" ? "Supabase Cloud"
            : activeDataSource === "backend" ? "Backend REST API"
            : activeDataSource === "local" ? "Local Storage (ชุดข้อมูลออฟไลน์)"
            : activeDataSource === "mock" ? "Mock Data (ชุดข้อมูลจำลอง)"
            : "ระบบประเมิน";

        return {
            systems: visibleSystems,
            records,
            systemStats,
            totalSystems: visibleSystems.length,
            totalUsers: uniqueEvaluators.size,
            totalEvaluations: records.length,
            overallSatisfactionAvg,
            ratingCounts,
            chartImages,
            effectiveness,
            filters: {
                system: systemFilterLabel,
                period: periodFilterLabel,
                role: roleFilterLabel,
                version: document.getElementById("qd-version")?.value || ""
            },
            source: sourceLabel,
            activeSection: isEffectiveness ? "effectiveness" : "satisfaction"
        };
    }

    if (exportHtmlBtn) {
        exportHtmlBtn.addEventListener("click", () => {
            const data = collectReportData();
            const section = (window.location.hash === "#quantitative-results") ? "effectiveness" : "satisfaction";
            const builder = window.ReportBuilder?.buildReportHtml || (typeof buildReportHtml !== "undefined" ? buildReportHtml : null);
            if (!builder) {
                alert("ไม่พบโมดูลสร้างรายงาน (ReportBuilder)");
                return;
            }
            const html = builder(data, { section });
            const dateStr = new Date().toISOString().slice(0, 10);
            const blob = new Blob([html], { type: "text/html;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `it-evaluator-report-${dateStr}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener("click", () => {
            const data = collectReportData();
            const section = (window.location.hash === "#quantitative-results") ? "effectiveness" : "satisfaction";
            const builder = window.ReportBuilder?.buildReportHtml || (typeof buildReportHtml !== "undefined" ? buildReportHtml : null);
            if (!builder) {
                alert("ไม่พบโมดูลสร้างรายงาน (ReportBuilder)");
                return;
            }
            const html = builder(data, { section });
            const iframe = document.createElement("iframe");
            iframe.style.position = "fixed";
            iframe.style.right = "0";
            iframe.style.bottom = "0";
            iframe.style.width = "0";
            iframe.style.height = "0";
            iframe.style.border = "0";
            document.body.appendChild(iframe);
            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(html);
            doc.close();
            iframe.contentWindow.focus();
            setTimeout(() => {
                try {
                    iframe.contentWindow.print();
                } catch (e) {
                    console.error("Print error:", e);
                }
                setTimeout(() => {
                    iframe.remove();
                }, 1000);
            }, 350);
        });
    }

    // ==========================================
    // 8. SIDEBAR NAVIGATION
    // ==========================================

    function syncDashboardSections() {
        document.getElementById("quantitative-results").hidden = window.location.hash !== "#quantitative-results";
    }
    window.addEventListener("hashchange", syncDashboardSections);
    syncDashboardSections();

    // Initial Data Fetch
    await loadData();

    // Listen for Assessment Catalog updates (Add/Rename/Delete topics)
    document.addEventListener("assessmentcatalogchange", () => {
        systems = getCurrentSystems();
        updateDashboard();
    });

});
