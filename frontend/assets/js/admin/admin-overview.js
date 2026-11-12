(function () {
    "use strict";
    const root = document.getElementById("admin-overview");
    if (!root) return;
    const scriptUrl = document.currentScript?.src || "";
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const mean = (value, n) => Number.isFinite(value) ? `${value.toFixed(2)} / 5 (n=${n})` : "ยังไม่มีข้อมูล";
    const levels = { urgent: "ควรปรับปรุงเร่งด่วน", review: "ควรตรวจสอบเพิ่มเติม", strength: "จุดแข็งควรรักษา", insufficient: "ข้อมูลยังไม่เพียงพอ" };
    const order = { urgent: 0, review: 1, strength: 2, insufficient: 3 };

    function statusPanel(message, error = false) {
        root.innerHTML = `<p class="admin-state${error ? " error" : ""}" role="${error ? "alert" : "status"}">${esc(message)}</p>${error ? '<button class="btn btn-secondary" id="overview-retry" type="button">ลองอีกครั้ง</button>' : ""}`;
        root.querySelector("#overview-retry")?.addEventListener("click", load);
    }

    function render(data) {
        const model = window.AdminOverviewModel.compute(data.systems, data.evaluations, data.questions, window.EffectivenessScoring, data.scoringConfig ? { improvement: data.scoringConfig } : undefined);
        const details = model.systems.slice().sort((a, b) => (order[a.signal.level] ?? 4) - (order[b.signal.level] ?? 4) || a.system.id.localeCompare(b.system.id));
        const counts = model.counts;
        const cards = [
            ["ควรปรับปรุงเร่งด่วน", counts.urgent], ["ควรตรวจสอบเพิ่มเติม", counts.review],
            ["จุดแข็งควรรักษา", counts.strength], ["ข้อมูลยังไม่เพียงพอ", counts.insufficient]
        ].map(([title, count]) => `<article class="admin-kpi"><h2>${title}</h2><p>${count}</p></article>`).join("");
        const rows = details.map(item => {
            const signal = item.signal;
            const reasons = signal.reasons.map(reason => esc(reason.message)).join("<br>");
            const score = item.effectivenessAverage;
            const sat = item.satisfaction?.average ?? null;
            const href = new URL(window.EvaluatorRuntimeUrl.fromScript("../../../admin/results.html", scriptUrl));
            href.searchParams.set("system", item.system.id);
            return `<tr><th scope="row"><a href="${esc(href.href)}">${esc(item.system.name)} (${esc(item.system.id)})</a></th>
              <td>${esc(mean(score, item.effectiveness.n))}</td><td>${esc(mean(sat, item.satisfaction?.n || 0))}<small>ความรู้สึกผู้ใช้</small></td>
              <td><strong class="priority-status priority-status-${esc(signal.level)}">${esc(levels[signal.level] || signal.label)}</strong></td><td>${reasons || "—"}</td></tr>`;
        }).join("");
        root.innerHTML = `<header class="admin-page-heading"><div><h1>ภาพรวมระบบ</h1><p>คะแนนประสิทธิผลมาจากคำตอบที่นับคะแนน ส่วนความพึงพอใจสะท้อนความรู้สึกของผู้ตอบ</p></div></header>
          ${model.mockCount ? '<p class="admin-state notice" role="status">ข้อมูลตัวอย่างจากฐานข้อมูล mock · ไม่ใช่ผลจริง</p>' : ""}
          <details class="admin-panel signal-settings"><summary>เกณฑ์สัญญาณ “ควรปรับปรุง”</summary><p>แก้เกณฑ์ที่ใช้กับทุกระบบ ค่าในช่องสัดส่วนใช้ช่วง 0–1 (เช่น 0.3 = 30%)</p>
            <div class="signal-settings-grid">${[
                ["minimumRespondents", "ผู้ตอบขั้นต่ำ (n)", 1, 100000, "1"], ["categoryLowBelow", "คะแนนหมวดต่ำกว่า", 1, 5, "0.01"],
                ["satisfactionLowBelow", "ความพึงพอใจต่ำกว่า", 1, 5, "0.01"], ["lowRatingAtOrBelow", "คะแนนต่ำ (≤)", 1, 5, "1"],
                ["lowRatingShareForReview", "สัดส่วนคะแนนต่ำเพื่อทบทวน", 0, 1, "0.01"], ["lowRatingShareForUrgent", "สัดส่วนคะแนนต่ำระดับเร่งด่วน", 0, 1, "0.01"],
                ["commonProblemShareForReview", "สัดส่วนปัญหาที่พบบ่อย", 0, 1, "0.01"], ["commonImprovementShareForReview", "สัดส่วนข้อเสนอที่พบบ่อย", 0, 1, "0.01"],
                ["urgentLowCategoryCount", "จำนวนหมวดต่ำระดับเร่งด่วน", 1, 6, "1"], ["urgentProblemShare", "สัดส่วนปัญหาระดับเร่งด่วน", 0, 1, "0.01"]
            ].map(([key, label, min, max, step]) => `<label>${label}<input type="number" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${esc(data.scoringConfig?.[key] ?? window.EffectivenessScoring.DEFAULT_SCORING_CONFIG.improvement[key])}"></label>`).join("")}
              <label>หมวดตัวชี้วัดที่นับ<input type="text" data-setting="coreCategories" value="${esc((data.scoringConfig?.coreCategories || window.EffectivenessScoring.DEFAULT_SCORING_CONFIG.improvement.coreCategories).join(", "))}"></label>
            </div><button id="save-signal-settings" class="btn btn-secondary" type="button">บันทึกเกณฑ์</button><span id="signal-settings-status" role="status"></span></details>
          <div class="admin-kpi-grid priority-kpi-grid">${cards}</div>
          <section class="admin-panel priority-table-panel"><h2>สัญญาณรายระบบ (${details.length} ระบบ)</h2><div class="admin-table-wrap priority-table-wrap" tabindex="0" role="region" aria-label="ตารางสัญญาณรายระบบ"><table><thead><tr><th>ระบบ</th><th>ประสิทธิผลเฉลี่ยรายหมวด · n</th><th>ความพึงพอใจ S1–S4 และข้อเฉพาะ · n</th><th>ระดับ</th><th>เหตุผลประกอบ</th></tr></thead><tbody>${rows}</tbody></table></div></section>
          <p class="admin-state notice">ระดับสัญญาณใช้จำนวนผู้ตอบ คะแนนรายหมวด สัดส่วนคะแนนต่ำ ปัญหา และข้อเสนอแนะร่วมกันตามเกณฑ์ในคลังคำถาม</p>`;
        root.querySelector("#save-signal-settings").addEventListener("click", async () => {
            const status = root.querySelector("#signal-settings-status");
            const improvement = {};
            for (const field of root.querySelectorAll("[data-setting]")) {
                if (field.dataset.setting === "coreCategories") improvement.coreCategories = field.value.split(",").map(value => value.trim()).filter(Boolean);
                else improvement[field.dataset.setting] = Number(field.value);
            }
            try { await window.EvaluationAPI.saveImprovementSettings(improvement); status.textContent = "บันทึกเกณฑ์แล้ว"; await load(); }
            catch (error) { status.textContent = `บันทึกไม่ได้: ${error.message}`; }
        });
    }

    async function load() {
        statusPanel("กำลังโหลดผลประเมินและคำถามจากฐานข้อมูล…");
        try {
            await window.AdminGuard.ready;
            const data = await window.AdminData.fromWindow().load();
            render(data);
        } catch (error) { statusPanel(`โหลดภาพรวมไม่ได้: ${error.message}`, true); }
    }
    document.addEventListener("langchange", load);
    load();
})();
