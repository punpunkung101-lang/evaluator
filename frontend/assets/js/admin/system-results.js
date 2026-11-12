(function () {
    "use strict";
    const main = document.getElementById("system-results");
    if (!main) return;
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const fmt = value => Number.isFinite(value) ? value.toFixed(2) : "—";
    const signalLabels = { urgent: "ควรปรับปรุงเร่งด่วน", review: "ควรตรวจสอบเพิ่มเติม", strength: "จุดแข็งควรรักษา", insufficient: "ข้อมูลยังไม่เพียงพอ" };

    function table(headers, rows, empty) {
        return `<div class="admin-table-wrap"><table><thead><tr>${headers.map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}">${empty}</td></tr>`}</tbody></table></div>`;
    }
    function render(data, systemId) {
        const system = data.systems.find(item => item.id === systemId);
        const title = document.getElementById("results-title");
        title.textContent = system ? `${system.name} (${system.id})` : "ผลประเมินรายระบบ";
        const evaluations = data.evaluations.filter(row => row.systemId === systemId);
        const effectivenessRows = evaluations.filter(row => row.assessmentType === "effectiveness");
        const satisfactionRows = evaluations.filter(row => row.assessmentType === "satisfaction");
        const questions = [...new Map(data.questions.filter(question => question.systemId === systemId || question.system_id === systemId || question.indicator_group === "core").map(question => [`${question.assessmentType || question.assessment_type}|${question.indicator_group === "core" ? "core" : systemId}|${question.id}`, question])).values()];
        const dedupeQuestionVersions = rows => [...new Map(rows.map(question => [`${question.indicator_group === "core" ? "core" : systemId}|${question.assessmentType || question.assessment_type}|${String(question.id).replace(/_v\d+$/, "")}`, question])).values()];
        const effectQuestions = dedupeQuestionVersions(questions.filter(question => (question.assessmentType || question.assessment_type) === "effectiveness"));
        const satisfactionQuestions = dedupeQuestionVersions(questions.filter(question => (question.assessmentType || question.assessment_type) === "satisfaction"));
        const effectiveness = window.EffectivenessScoring.summarizeEffectiveness(effectivenessRows, effectQuestions);
        const satisfaction = window.EffectivenessScoring.summarizeSatisfactionAssessment(satisfactionRows, satisfactionQuestions).find(row => row.systemId === systemId);
        const signals = window.EffectivenessScoring.buildImprovementSignals(data.evaluations, data.questions, data.systems);
        const signal = signals.find(row => row.systemId === systemId);
        const categories = Object.values(effectiveness.categoryStats);
        const categoryRows = categories.map(group => `<tr><th scope="row">${esc(group.section)}</th><td>${fmt(group.average)} / 5</td><td>${group.n}</td><td>${group.naCount}</td><td>${esc(group.levelLabel || "—")}</td></tr>`).join("");
        const questionRows = Object.values(effectiveness.questionStats).map(question => `<tr><th scope="row">${esc(question.text)} <small>${esc(question.id)}</small></th><td>${fmt(question.average)} / 5</td><td>${question.n}</td><td>${question.naCount}</td><td>${esc(question.levelLabel || "—")}</td></tr>`).join("");
        const sharedSatisfaction = satisfactionQuestions.filter(question => question.indicator_group === "core");
        const specificRows = (satisfaction?.specific || []).map(item => `<tr><th scope="row">${esc(item.text || satisfactionQuestions.find(q => q.id === item.id)?.text || item.id)}</th><td>${fmt(item.average)} / 5</td><td>${item.n}</td></tr>`).join("");
        const roleRows = Object.values(satisfaction?.byRole || {}).map(role => `<tr><th scope="row">${esc(role.roleLabel || role.role)}</th><td>${fmt(role.coreAverage)} / 5</td><td>${fmt(role.average)} / 5</td><td>${role.n}</td></tr>`).join("");
        const effectRoleRows = Object.values(effectiveness.byRole || {}).map(role => `<tr><th scope="row">${esc(role.roleLabel || role.role)}</th><td>${fmt(role.average)} / 5</td><td>${role.n}</td></tr>`).join("");
        const priorRows = Object.values(effectiveness.byPriorUse || {}).map(group => `<tr><th scope="row">${esc(group.priorUse)}</th><td>${fmt(group.average)} / 5</td><td>${group.n}</td></tr>`).join("");
        const openQuestions = effectQuestions.filter(q => ["issue_impact", "other_suggestions"].includes(q.id));
        const openRows = effectivenessRows.flatMap(record => (record.answers || []).filter(answer => openQuestions.some(q => q.id === (answer.questionId || answer.question_id))).map(answer => {
            const questionId = answer.questionId || answer.question_id;
            const question = openQuestions.find(q => q.id === questionId);
            const value = answer.value ?? answer.answer ?? answer.answer_value;
            return value == null || value === "" ? "" : `<tr><th scope="row">${esc(question?.text || questionId)}</th><td>${esc(Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : value)}</td><td>${esc(record.respondentRoleLabel || record.respondentRole || "ไม่ระบุ")}</td></tr>`;
        })).filter(Boolean).join("");
        const factorRows = [["ปัญหาที่เลือกบ่อย", signal?.commonProblem], ["สิ่งที่ต้องการปรับปรุง", signal?.commonImprovement]].map(([label, item]) => `<tr><th scope="row">${label}</th><td>${item ? esc(item.label) : "ยังไม่มีข้อมูล"}</td><td>${item ? `${(item.share * 100).toFixed(0)}% · ${item.count} คำตอบ` : "—"}</td></tr>`).join("");
        const reasons = signal?.reasons?.map(item => `<li>${esc(item.message)}</li>`).join("") || "<li>ไม่มีข้อมูลประกอบ</li>";
        const mockCount = evaluations.filter(row => row.isMock || String(row.id).startsWith("mock-")).length;
        document.getElementById("results-status").innerHTML = mockCount ? '<p class="admin-state notice" role="status">ข้อมูล mock สำหรับตัวอย่างการแสดงผล ไม่ใช่ผลจริง</p>' : "";
        document.getElementById("tab-summary").innerHTML = `<section class="admin-panel"><h2>สรุประบบ</h2><p>คำตอบประสิทธิผล ${effectiveness.records} รายการ · ผู้ตอบ n=${effectiveness.n}</p><p>ความพึงพอใจ ${satisfaction?.n || 0} รายการ · ค่าเฉลี่ย ${fmt(satisfaction?.average)} / 5</p><p>ความพึงพอใจเป็นการรับรู้ของผู้ใช้ ไม่ใช่สถิติระบบต้นทาง</p></section>
          <section class="admin-panel"><h2>สัญญาณการปรับปรุง</h2><p><strong>${esc(signalLabels[signal?.level] || "ข้อมูลยังไม่เพียงพอ")}</strong></p><ul>${reasons}</ul></section>
          <section class="admin-panel"><h2>ค่าเฉลี่ยประสิทธิผลรายหมวด · n กำกับทุกค่า</h2>${table(["หมวด", "ค่าเฉลี่ย", "n", "N/A", "ระดับ"], categoryRows, "ยังไม่มีคำตอบที่นับคะแนน")}</section>
          <section class="admin-panel"><h2>ปัจจัยที่มีผลต่อสัญญาณ</h2>${table(["ปัจจัย", "ผลที่พบ", "สัดส่วน"], factorRows, "ยังไม่มีข้อมูล")}</section>
          <section class="admin-panel"><h2>ความต่างระหว่างคะแนนเฉลี่ยกับสถิติระบบต้นทาง</h2><p>ผลในหน้านี้เป็นการรับรู้และคำตอบของผู้ใช้ ยังไม่มีข้อมูลจากระบบต้นทาง</p></section>`;
        document.getElementById("tab-effectiveness").innerHTML = `<section class="admin-panel"><h2>ผลประสิทธิผลตามคำถามที่นับคะแนน</h2><p>คะแนน 1–5 เท่านั้น; N/A ไม่นำมาคิดคะแนน</p>${table(["คำถาม", "เฉลี่ย", "n", "N/A", "ระดับ"], questionRows, "ยังไม่มีคำตอบประสิทธิผลที่นับคะแนน")}</section>
          <section class="admin-panel"><h2>แยกตามบทบาทผู้ตอบ</h2>${table(["บทบาท", "ค่าเฉลี่ย", "n"], effectRoleRows, "ยังไม่มีข้อมูลแยกบทบาท")}</section>
          <section class="admin-panel"><h2>เปรียบเทียบผู้เคยใช้ระบบเดิม</h2>${table(["ประสบการณ์เดิม", "ค่าเฉลี่ย", "n"], priorRows, "ยังไม่มีข้อมูลเปรียบเทียบ")}</section>
          <section class="admin-panel"><h2>ความคิดเห็นปลายเปิด</h2>${table(["คำถาม", "คำตอบ", "บทบาท"], openRows, "ยังไม่มีความคิดเห็นปลายเปิด")}</section>`;
        document.getElementById("tab-satisfaction").innerHTML = `<section class="admin-panel"><h2>ความพึงพอใจ Core S1–S4 · ความรู้สึกผู้ใช้</h2>${table(["คำถาม", "ค่าเฉลี่ย", "n"], sharedSatisfaction.map(q => { const stat = satisfaction?.questionStats?.[q.id]; return `<tr><th scope="row">${esc(q.text)}</th><td>${fmt(stat?.average)} / 5</td><td>${stat?.n || 0}</td></tr>`; }).join(""), "ยังไม่มีคำถาม Core")}</section>
          <section class="admin-panel"><h2>ข้อเฉพาะระบบ</h2>${table(["คำถาม", "ค่าเฉลี่ย", "n"], specificRows, "ยังไม่มีคำตอบข้อเฉพาะ")}</section>
          <section class="admin-panel"><h2>แยกตามบทบาทผู้ตอบ</h2>${table(["บทบาท", "Core S1–S4", "รวมข้อเฉพาะ", "n"], roleRows, "ยังไม่มีข้อมูลแยกบทบาท")}</section>`;
        window.AdminTabs.mount({ activeTab: location.hash.slice(1) || "summary", systemId, systems: data.systems });
        showTab();
    }
    function showTab() {
        const tab = ["summary", "effectiveness", "satisfaction", "settings"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "summary";
        for (const name of ["summary", "effectiveness", "satisfaction", "settings"]) {
            const panel = document.getElementById(`tab-${name}`); if (panel) panel.hidden = name !== tab;
        }
        document.querySelector(".admin-settings-links")?.toggleAttribute("hidden", tab !== "settings");
    }
    async function load() {
        const status = document.getElementById("results-status");
        status.textContent = "กำลังโหลดผลและคลังคำถาม…";
        try {
            await window.AdminGuard.ready;
            const data = await window.AdminData.fromWindow().load();
            const requested = new URLSearchParams(location.search).get("system");
            const systemId = data.systems.some(item => item.id === requested) ? requested : data.systems[0]?.id;
            if (!systemId) throw new Error("ไม่พบระบบที่เปิดใช้งาน");
            render(data, systemId);
        } catch (error) {
            status.innerHTML = `<p class="admin-state error" role="alert">โหลดผลประเมินไม่ได้: ${esc(error.message)}</p><button class="btn btn-secondary" id="results-retry" type="button">ลองอีกครั้ง</button>`;
            document.getElementById("results-retry")?.addEventListener("click", load);
        }
    }
    window.addEventListener("hashchange", showTab);
    document.addEventListener("langchange", load);
    load();
})();
