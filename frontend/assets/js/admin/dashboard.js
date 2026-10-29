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

document.addEventListener("DOMContentLoaded", async () => {

    // ==========================================
    // 1. DATA SOURCES & SYSTEMS DEFINITION
    // ==========================================

    const categoryList = typeof categories !== "undefined" ? categories : [];

    const systems = categoryList.flatMap(category =>
        (category.systems || []).map(system => ({
            ...system,
            categoryId: String(category.id),
            categoryName: category.name
        }))
    );

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

    const categoryFilter = document.getElementById("categoryFilter");
    const roleFilter = document.getElementById("userTypeFilter");
    const periodFilter = document.getElementById("periodFilter");
    const tableBody = document.getElementById("systemsTableBody");

    // Populate category dropdown
    if (categoryFilter && categoryList.length > 0) {
        categoryList.forEach(category => {
            const option = document.createElement("option");
            option.value = String(category.id);
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    }

    // ==========================================
    // 3. STATISTICAL HELPERS
    // ==========================================

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
        const selectedCategory = categoryFilter?.value || "all";
        const selectedRole = roleFilter?.value || "all";
        const selectedPeriod = periodFilter?.value || "all";

        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);
        const currentYear = today.toISOString().slice(0, 4);

        // Filter Systems
        const visibleSystems = systems.filter(s =>
            selectedCategory === "all" || s.categoryId === selectedCategory
        );
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

            return matchSystem && matchRole && matchPeriod;
        });

        // 1. Summary Metrics
        const uniqueEvaluators = new Set(
            records.map(r => r.evaluatorId || r.evaluatorName)
        );

        const allSatisfactionScores = records
            .map(r => r.satisfactionAverage ?? average(r.satisfactionAnswers))
            .filter(v => typeof v === "number" && !isNaN(v));

        const overallSatisfactionAvg = average(allSatisfactionScores);

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

        const hasRecords = records.length > 0;

        // 2. Before / After Comparison Chart
        const beforeAfterCanvas = document.getElementById("beforeAfterChart");
        const beforeAfterEmpty = document.getElementById("beforeAfterEmpty");

        if (!hasRecords) {
            if (beforeAfterCanvas) beforeAfterCanvas.style.display = "none";
            if (beforeAfterEmpty) beforeAfterEmpty.style.display = "flex";
            destroyChart("beforeAfterChart");
        } else {
            if (beforeAfterCanvas) beforeAfterCanvas.style.display = "block";
            if (beforeAfterEmpty) beforeAfterEmpty.style.display = "none";

            const beforeScores = [];
            const afterScores = [];

            questionNames.forEach((_, qIndex) => {
                const pairs = records.filter(r =>
                    typeof r.beforeAnswers?.[qIndex] === "number" &&
                    typeof r.afterAnswers?.[qIndex] === "number"
                );
                beforeScores.push(average(pairs.map(r => r.beforeAnswers[qIndex])));
                afterScores.push(average(pairs.map(r => r.afterAnswers[qIndex])));
            });

            drawChart("beforeAfterChart", {
                type: "bar",
                data: {
                    labels: questionNames,
                    datasets: [
                        {
                            label: "ก่อนนำระบบ IT มาใช้",
                            data: beforeScores,
                            backgroundColor: colorBefore,
                            borderRadius: 4
                        },
                        {
                            label: "หลังนำระบบ IT มาใช้",
                            data: afterScores,
                            backgroundColor: colorAfter,
                            borderRadius: 4
                        }
                    ]
                },
                options: standardChartOptions(5)
            });
        }

        // 3. Evaluation Status Doughnut Chart
        const statusCanvas = document.getElementById("evaluationStatusChart");
        const statusEmpty = document.getElementById("statusEmpty");
        const statusLegend = document.getElementById("statusLegend");

        const evaluatedSystemIds = new Set(records.map(r => r.systemId));
        const evaluatedCount = visibleSystems.filter(s => evaluatedSystemIds.has(s.id)).length;
        const pendingCount = visibleSystems.length - evaluatedCount;

        if (visibleSystems.length === 0) {
            if (statusCanvas) statusCanvas.style.display = "none";
            if (statusEmpty) statusEmpty.style.display = "flex";
            if (statusLegend) statusLegend.style.display = "none";
            destroyChart("evaluationStatusChart");
        } else {
            if (statusCanvas) statusCanvas.style.display = "block";
            if (statusEmpty) statusEmpty.style.display = "none";
            if (statusLegend) statusLegend.style.display = "flex";

            drawChart("evaluationStatusChart", {
                type: "doughnut",
                data: {
                    labels: ["มีผลการประเมิน", "ยังไม่มีการประเมิน"],
                    datasets: [{
                        data: [evaluatedCount, pendingCount],
                        backgroundColor: [colorPrimary, "#e2e8f0"],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "70%",
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // 4. Satisfaction Breakdown
        if (!hasRecords || allSatisfactionScores.length === 0) {
            setText("happyPercent", "0%");
            setText("neutralPercent", "0%");
            setText("unhappyPercent", "0%");
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
        }

        // 5. Category Averages Chart
        const categoryCanvas = document.getElementById("categoryChart");
        const categoryEmpty = document.getElementById("categoryEmpty");

        if (!hasRecords) {
            if (categoryCanvas) categoryCanvas.style.display = "none";
            if (categoryEmpty) categoryEmpty.style.display = "flex";
            destroyChart("categoryChart");
        } else {
            if (categoryCanvas) categoryCanvas.style.display = "block";
            if (categoryEmpty) categoryEmpty.style.display = "none";

            const shownCategories = categoryList.filter(c =>
                selectedCategory === "all" || String(c.id) === selectedCategory
            );

            const catAverages = shownCategories.map(cat => {
                const catRecords = records.filter(r => {
                    const sys = systems.find(s => s.id === r.systemId);
                    return sys && sys.categoryId === String(cat.id);
                });
                return average(catRecords.map(r => r.satisfactionAverage ?? average(r.satisfactionAnswers)));
            });

            drawChart("categoryChart", {
                type: "bar",
                data: {
                    labels: shownCategories.map(c => c.name),
                    datasets: [{
                        label: "คะแนนเฉลี่ยความพึงพอใจ (เต็ม 5)",
                        data: catAverages,
                        backgroundColor: colorAccent,
                        borderRadius: 4
                    }]
                },
                options: standardChartOptions(5)
            });
        }

        // 6. Satisfaction Trend Chart
        const trendCanvas = document.getElementById("satisfactionTrendChart");
        const trendEmpty = document.getElementById("trendEmpty");

        if (!hasRecords) {
            if (trendCanvas) trendCanvas.style.display = "none";
            if (trendEmpty) trendEmpty.style.display = "flex";
            destroyChart("satisfactionTrendChart");
        } else {
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
            row.innerHTML = `<td colspan="10">ไม่พบระบบสารสนเทศตามหมวดหมู่ที่เลือก</td>`;
            tableBody.appendChild(row);
            return;
        }

        visibleSystems.forEach((system, index) => {
            const sysRecords = records.filter(r => r.systemId === system.id);

            const beforeList = [];
            const afterList = [];

            sysRecords.forEach(r => {
                for (let i = 0; i < 10; i++) {
                    const b = r.beforeAnswers?.[i];
                    const a = r.afterAnswers?.[i];
                    if (typeof b === "number" && typeof a === "number") {
                        beforeList.push(b);
                        afterList.push(a);
                    }
                }
            });

            const beforeAvg = average(beforeList);
            const afterAvg = average(afterList);
            const satAvg = average(sysRecords.map(r => r.satisfactionAverage ?? average(r.satisfactionAnswers)));

            let diffBadge = "-";
            if (beforeAvg !== null && afterAvg !== null) {
                const diff = afterAvg - beforeAvg;
                const sign = diff > 0 ? "+" : "";
                const badgeClass = diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral";
                diffBadge = `<span class="score-badge ${badgeClass}">${sign}${diff.toFixed(2)}</span>`;
            }

            const uniqueSysUsers = new Set(sysRecords.map(r => r.evaluatorId || r.evaluatorName)).size;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${system.id}</strong></td>
                <td>${system.name}</td>
                <td>${system.categoryName || "-"}</td>
                <td>${uniqueSysUsers} คน</td>
                <td>${formatScore(beforeAvg)}</td>
                <td>${formatScore(afterAvg)}</td>
                <td>${diffBadge}</td>
                <td><strong>${formatScore(satAvg)}</strong></td>
                <td>
                    <a href="evaluation-detail.html?system=${encodeURIComponent(system.id)}" class="detail-btn">
                        รายละเอียด
                    </a>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Filter Listeners
    [categoryFilter, roleFilter, periodFilter].forEach(el => {
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

    function handleFileImport(file) {
        if (!file.name.endsWith(".json")) {
            alert("กรุณาเลือกไฟล์ข้อมูลที่มีนามสกุล .json เท่านั้น");
            return;
        }

        const reader = new FileReader();
        reader.onload = e => {
            const result = EvaluationAPI.importEvaluationsJSON(e.target.result);
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
        clearDataBtn.addEventListener("click", () => {
            if (confirm("ท่านต้องการล้างชุดข้อมูลการประเมินที่นำเข้าทั้งหมดใช่หรือไม่?")) {
                EvaluationAPI.clearLocalStorage();
                alert("ล้างชุดข้อมูลเรียบร้อยแล้ว");
                closeModal();
                loadData();
            }
        });
    }

    // ==========================================
    // 7. EXPORT FUNCTIONALITY (HTML & PDF)
    // ==========================================

    const exportHtmlBtn = document.getElementById("exportHtmlBtn");
    const exportPdfBtn = document.getElementById("exportPdfBtn");

    /**
     * Export Standalone Academic HTML Document
     */
    if (exportHtmlBtn) {
        exportHtmlBtn.addEventListener("click", () => {
            const timestamp = new Date().toLocaleString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
            const totalSys = document.getElementById("totalSystems")?.textContent || "0";
            const totalUsers = document.getElementById("totalUsers")?.textContent || "0";
            const totalEvals = document.getElementById("totalEvaluations")?.textContent || "0";
            const avgSat = document.getElementById("averageSatisfaction")?.textContent || "-";

            const happy = document.getElementById("happyPercent")?.textContent || "0%";
            const neutral = document.getElementById("neutralPercent")?.textContent || "0%";
            const unhappy = document.getElementById("unhappyPercent")?.textContent || "0%";

            const beforeAfterImg = charts["beforeAfterChart"]?.toBase64Image() || "";
            const categoryImg = charts["categoryChart"]?.toBase64Image() || "";
            const statusImg = charts["evaluationStatusChart"]?.toBase64Image() || "";
            const trendImg = charts["satisfactionTrendChart"]?.toBase64Image() || "";

            const tableRowsHtml = Array.from(tableBody.querySelectorAll("tr")).map(tr => {
                const tds = Array.from(tr.querySelectorAll("td"));
                if (tds.length < 9) return tr.outerHTML;
                return `<tr>${tds.slice(0, 9).map(td => td.outerHTML).join("")}</tr>`;
            }).join("");

            const hasData = rawEvaluations.length > 0;

            const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานผลการประเมินประสิทธิภาพระบบ IT - ${timestamp}</title>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Kanit', sans-serif; margin: 40px auto; max-width: 1080px; color: #0f172a; background: #ffffff; padding: 0 24px; line-height: 1.5; }
        .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header h1 { margin: 0; font-size: 22px; color: #1e3a8a; font-weight: 600; }
        .header p { margin: 4px 0 0; color: #475569; font-size: 13px; }
        .badge { background: #ecfdf5; color: #065f46; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; border: 1px solid #a7f3d0; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; background: #f8fafc; }
        .stat-card h3 { font-size: 12px; color: #64748b; margin: 0 0 6px; font-weight: 500; }
        .stat-card h2 { font-size: 24px; color: #0f172a; margin: 0; font-weight: 700; }
        .charts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px; }
        .chart-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
        .chart-box h3 { margin: 0 0 12px; font-size: 14px; color: #0f172a; font-weight: 600; }
        .chart-img { width: 100%; height: auto; max-height: 240px; object-fit: contain; }
        .table-box { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f8fafc; padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
        .empty-state { text-align: center; padding: 48px; color: #64748b; border: 1px dashed #cbd5e1; border-radius: 8px; margin: 24px 0; }
        .footer { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>รายงานผลการประเมินประสิทธิภาพและประสิทธิผลระบบ IT</h1>
            <p>คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร | วันที่ออกรายงาน: ${timestamp}</p>
        </div>
        <div>
            <span class="badge">${hasData ? "ชุดข้อมูลการประเมินจริง (Live Report)" : "ไม่มีข้อมูลการประเมิน"}</span>
        </div>
    </div>

    ${!hasData ? `
    <div class="empty-state">
        <h2 style="font-size: 16px; margin-bottom: 8px; color: #0f172a;">ไม่พบข้อมูลการประเมินในระบบ (No evaluation records available)</h2>
        <p>ยังไม่มีการบันทึกผลการประเมินสำหรับระบบสารสนเทศตามเงื่อนไขที่กำหนด</p>
    </div>
    ` : `
    <div class="summary-grid">
        <div class="stat-card"><h3>ระบบสารสนเทศทั้งหมด</h3><h2>${totalSys}</h2></div>
        <div class="stat-card"><h3>จำนวนผู้ร่วมประเมิน</h3><h2>${totalUsers}</h2></div>
        <div class="stat-card"><h3>ชุดข้อมูลการประเมิน</h3><h2>${totalEvals}</h2></div>
        <div class="stat-card"><h3>ความพึงพอใจเฉลี่ย</h3><h2>${avgSat} <small style="font-size:13px;color:#64748b;">/ 5</small></h2></div>
    </div>

    <div class="charts-grid">
        <div class="chart-box">
            <h3>เปรียบเทียบผลการดำเนินงานก่อน–หลังการใช้ระบบ IT</h3>
            ${beforeAfterImg ? `<img src="${beforeAfterImg}" class="chart-img" alt="Before/After Comparison Chart">` : `<p style="font-size:12px;color:#64748b;">ไม่มีข้อมูลกราฟ</p>`}
        </div>
        <div class="chart-box">
            <h3>ระดับความพึงพอใจของผู้ใช้งาน</h3>
            <p style="margin: 10px 0; font-size: 13px;">ระดับพึงพอใจสูง (≥ 3.50): <strong>${happy}</strong></p>
            <p style="margin: 10px 0; font-size: 13px;">ระดับปานกลาง (2.50 – 3.49): <strong>${neutral}</strong></p>
            <p style="margin: 10px 0; font-size: 13px;">ควรปรับปรุงแก้ไข (&lt; 2.50): <strong>${unhappy}</strong></p>
            ${statusImg ? `<img src="${statusImg}" class="chart-img" style="max-height: 130px; margin-top: 8px;" alt="Status Proportion Chart">` : ""}
        </div>
    </div>

    <div class="charts-grid">
        <div class="chart-box">
            <h3>ผลการประเมินจำแนกตามหมวดหมู่งาน</h3>
            ${categoryImg ? `<img src="${categoryImg}" class="chart-img" alt="Category Average Chart">` : `<p style="font-size:12px;color:#64748b;">ไม่มีข้อมูลกราฟ</p>`}
        </div>
        <div class="chart-box">
            <h3>แนวโน้มความพึงพอใจย้อนหลัง</h3>
            ${trendImg ? `<img src="${trendImg}" class="chart-img" alt="Satisfaction Trend Chart">` : `<p style="font-size:12px;color:#64748b;">ไม่มีข้อมูลกราฟ</p>`}
        </div>
    </div>

    <h3 style="margin-top: 24px; font-size: 14px; font-weight: 600;">ตารางสรุปผลการประเมินประสิทธิภาพรายระบบ</h3>
    <div class="table-box">
        <table>
            <thead>
                <tr>
                    <th>ลำดับ</th>
                    <th>รหัสระบบ</th>
                    <th>ชื่อระบบสารสนเทศ</th>
                    <th>หมวดหมู่งาน</th>
                    <th>จำนวนผู้ประเมิน</th>
                    <th>ก่อนใช้ / 5</th>
                    <th>หลังใช้ / 5</th>
                    <th>ส่วนต่างคะแนน</th>
                    <th>ความพึงพอใจ / 5</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHtml}
            </tbody>
        </table>
    </div>
    `}

    <div class="footer">
        ระบบประเมินประสิทธิภาพ IT © 2026 | คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร (Faculty of Allied Health Sciences, Naresuan University)
    </div>
</body>
</html>`;

            const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `it-evaluator-report-${new Date().toISOString().slice(0, 10)}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    /**
     * Export to PDF via Browser Print
     */
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener("click", () => {
            window.print();
        });
    }

    // ==========================================
    // 8. SIDEBAR NAVIGATION
    // ==========================================

    const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");

    navLinks.forEach(link => {
        link.addEventListener("click", event => {
            const targetId = link.getAttribute("href");
            if (!targetId || !targetId.startsWith("#")) return;

            const target = document.querySelector(targetId);
            if (!target) return;

            event.preventDefault();
            navLinks.forEach(item => item.classList.remove("active"));
            link.classList.add("active");

            if (targetId === "#overview") {
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }

            target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    // Initial Data Fetch
    await loadData();
});
