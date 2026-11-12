(function () {
    "use strict";
    const root = document.getElementById("question-admin");
    if (!root) return;
    const TYPES = ["rating5", "dropdown", "radio", "checkbox", "short_text", "long_text", "number", "date", "yes_no", "ranking"];
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const baseId = id => String(id || "").replace(/_(?:v\d+|core_\d+)$/, "");
    let systems = [], questions = [], optionSets = [], assessmentType = "effectiveness", isCore = false, busy = false, selectedSystemId = "";

    function normalize(question, index) {
        return {
            id: baseId(question.id) || `admin_${assessmentType}_${Date.now()}_${index}`,
            systemId: question.systemId || null,
            assessmentType: question.assessmentType || assessmentType,
            indicator_group: question.indicator_group || (isCore ? "core" : "specific"),
            section: question.section || "general",
            text: question.text || "", text_en: question.text_en || "",
            answer_type: question.answer_type || "rating5",
            options: question.options || [], required: question.required !== false,
            is_scored: question.is_scored === true, step: Number(question.step) || 3,
            order: Number(question.order) || index + 1, roles: question.roles || [],
            visible_when: question.visible_when || { all: [] }, allow_na: question.allow_na === true,
            allow_other: question.allow_other === true, max_select: question.max_select ?? null,
            optionSetRef: question.optionSetRef || question.option_set_ref || question.metadata?.option_set_ref || "", metadata: question.metadata || {}, active: question.active !== false
        };
    }

    function controls(q, index) {
        const key = `q-${index}`;
        return `<article class="admin-panel question-editor" data-question-index="${index}">
          <header class="question-editor-heading"><div><strong>${esc(q.id)}</strong><span class="question-scope-tag">${isCore ? "Core · ใช้ร่วมทุกระบบ" : `Specific · ${esc(document.getElementById("question-system")?.value || "")}`}</span></div>
            <label class="question-active"><input type="checkbox" data-field="active" ${q.active ? "checked" : ""}> เปิดใช้งาน</label></header>
          <div class="question-editor-grid">
            <label>คำถาม (ไทย)<textarea data-field="text" rows="2" required>${esc(q.text)}</textarea></label>
            <label>Question (English)<textarea data-field="text_en" rows="2">${esc(q.text_en)}</textarea></label>
            <label>ชนิดคำตอบ<select data-field="answer_type">${TYPES.map(type => `<option${type === q.answer_type ? " selected" : ""}>${type}</option>`).join("")}</select></label>
            <label>หมวด / ตัวชี้วัด<input data-field="section" value="${esc(q.section)}"></label>
            <label>ขั้น (1–4)<input type="number" min="1" max="4" data-field="step" value="${q.step}"></label>
            <label>ลำดับ<input type="number" min="1" data-field="order" value="${q.order}"></label>
            <label>Roles (JSON)<textarea data-field="roles" rows="2">${esc(JSON.stringify(q.roles))}</textarea></label>
            <label>เงื่อนไขแสดง visible_when (JSON)<textarea data-field="visible_when" rows="3">${esc(JSON.stringify(q.visible_when, null, 2))}</textarea></label>
            <label>ตัวเลือก (JSON)<textarea data-field="options" rows="4">${esc(JSON.stringify(q.options, null, 2))}</textarea></label>
            <label>Option set<input data-field="optionSetRef" value="${esc(q.optionSetRef)}"></label>
            <label>max_select<input type="number" min="1" data-field="max_select" value="${esc(q.max_select ?? "")}"></label>
            <label>metadata (JSON)<textarea data-field="metadata" rows="2">${esc(JSON.stringify(q.metadata, null, 2))}</textarea></label>
          </div>
          <div class="question-flags"><label><input type="checkbox" data-field="required" ${q.required ? "checked" : ""}> จำเป็นต้องตอบ</label><label><input type="checkbox" data-field="is_scored" ${q.is_scored ? "checked" : ""}> นำไปคิดคะแนน</label><label><input type="checkbox" data-field="allow_na" ${q.allow_na ? "checked" : ""}> อนุญาต N/A</label><label><input type="checkbox" data-field="allow_other" ${q.allow_other ? "checked" : ""}> อนุญาต “อื่น ๆ”</label></div>
          <button type="button" class="btn btn-secondary btn-sm" data-preview="${key}">ดูตัวอย่างคำถาม</button>
        </article>`;
    }

    function readEditor(editor) {
        const value = name => editor.querySelector(`[data-field="${name}"]`);
        const json = name => {
            try { return JSON.parse(value(name).value || (name === "visible_when" ? '{"all":[]}' : "[]")); }
            catch { throw new Error(`${name} ต้องเป็น JSON ที่ถูกต้อง (${editor.querySelector("strong").textContent})`); }
        };
        return {
            id: editor.querySelector("strong").textContent,
            indicator_group: isCore ? "core" : "specific",
            section: value("section").value.trim(), text: value("text").value.trim(), text_en: value("text_en").value.trim(),
            answer_type: value("answer_type").value, step: Number(value("step").value), order: Number(value("order").value),
            roles: json("roles"), visible_when: json("visible_when"), options: json("options"), metadata: json("metadata"),
            required: value("required").checked, is_scored: value("is_scored").checked, allow_na: value("allow_na").checked,
            allow_other: value("allow_other").checked, max_select: value("max_select").value ? Number(value("max_select").value) : null,
            optionSetRef: value("optionSetRef").value.trim() || null, active: value("active").checked
        };
    }

    function preview(question) {
        const choices = Array.isArray(question.options) ? question.options : [];
        const control = question.answer_type === "rating5" ? `<div class="preview-ratings">${[1,2,3,4,5].map(n => `<label><input type="radio" name="preview-${esc(question.id)}" disabled><span>${n}</span></label>`).join("")}</div>`
            : ["radio", "checkbox", "yes_no"].includes(question.answer_type) ? choices.map(item => `<label class="choice-option"><input type="${question.answer_type === "checkbox" ? "checkbox" : "radio"}" disabled><span>${esc(item.label || item.value)}</span></label>`).join("")
            : question.answer_type === "dropdown" ? `<select disabled><option>เลือกคำตอบ</option>${choices.map(item => `<option>${esc(item.label || item.value)}</option>`).join("")}</select>`
            : question.answer_type === "long_text" ? '<textarea rows="3" disabled></textarea>'
            : `<input type="${question.answer_type === "number" || question.answer_type === "date" ? question.answer_type : "text"}" disabled>`;
        const dialog = document.getElementById("question-preview");
        dialog.querySelector(".preview-question").innerHTML = `<strong>${esc(question.text)}</strong>${question.text_en ? `<p>${esc(question.text_en)}</p>` : ""}<div>${control}</div><small>คำตอบชนิด ${esc(question.answer_type)} · ขั้น ${question.step} · ${question.required ? "จำเป็น" : "ไม่บังคับ"}${question.is_scored ? " · นับคะแนน" : " · ไม่นับคะแนน"}</small>`;
        if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
    }

    function draw() {
        root.innerHTML = `<div class="admin-page-heading"><div><h1>จัดการคลังคำถาม</h1><p>แก้ชนิดคำตอบ เงื่อนไข บทบาท และการคิดคะแนน คำถามที่ปิดจะไม่แสดงในแบบประเมินใหม่</p></div></div>
          <section class="admin-panel question-admin-controls"><label>ขอบเขต<select id="question-scope"><option value="specific">Specific · เฉพาะระบบ</option><option value="core">Core · ใช้ร่วมทุกระบบ</option></select></label>
            <label id="system-picker-field">ระบบ<select id="question-system">${systems.map(system => `<option value="${esc(system.id)}">${esc(system.id)} — ${esc(system.name)}</option>`).join("")}</select></label>
            <label>แบบประเมิน<select id="question-type"><option value="effectiveness">ประสิทธิผล</option><option value="satisfaction">ความพึงพอใจ</option></select></label></section>
          <p id="question-admin-status" class="admin-state" role="status" aria-live="polite"></p>
          <div class="question-admin-actions"><button type="button" class="btn btn-secondary" id="question-add">เพิ่มคำถาม</button><button type="button" class="btn btn-primary" id="question-save" ${window.EvaluatorDemo?.active ? "disabled" : ""}>บันทึกและเผยแพร่เวอร์ชันใหม่</button></div>
          <div id="question-admin-list"></div>
          <details class="admin-panel optionset-manager"><summary>จัดการชุดตัวเลือกต่อเนื่อง (${optionSets.length} ชุด)</summary><p>แก้รายการตามระบบหรือบทบาท และความสัมพันธ์ของ dropdown ที่ใช้ร่วมกันได้</p><div id="optionset-list">${optionSets.map((set, index) => `<article class="question-editor" data-optionset-index="${index}"><h3>${esc(set.id)} ${set.systemId ? `· ${esc(set.systemId)}` : "· ใช้ร่วมทุกระบบ"}</h3><div class="question-editor-grid"><label>รายการตัวเลือก (JSON)<textarea data-options="options" rows="3">${esc(JSON.stringify(set.options || [], null, 2))}</textarea></label><label>ค่าตามระบบ (JSON)<textarea data-options="valuesBySystem" rows="3">${esc(JSON.stringify(set.valuesBySystem || {}, null, 2))}</textarea></label><label>ค่าตามบทบาท (JSON)<textarea data-options="valuesByRole" rows="3">${esc(JSON.stringify(set.valuesByRole || {}, null, 2))}</textarea></label><label>เงื่อนไข/ลำดับการเชื่อม (JSON)<textarea data-options="dependsOn" rows="2">${esc(JSON.stringify(set.dependsOn || [], null, 2))}</textarea></label></div></article>`).join("") || "<p>ไม่มีชุดตัวเลือก</p>"}</div><div class="question-admin-actions"><button type="button" class="btn btn-secondary" id="optionset-add" ${window.EvaluatorDemo?.active ? "disabled" : ""}>เพิ่มชุดตัวเลือก</button><button type="button" class="btn btn-primary" id="optionset-save" ${window.EvaluatorDemo?.active ? "disabled" : ""}>บันทึกชุดตัวเลือก</button></div></details>
          <dialog id="question-preview" class="admin-panel question-preview-dialog"><h2>ตัวอย่างคำถาม</h2><div class="preview-question"></div><form method="dialog"><button class="btn btn-secondary">ปิด</button></form></dialog>`;
        const scope = root.querySelector("#question-scope"), system = root.querySelector("#question-system"), type = root.querySelector("#question-type");
        scope.value = isCore ? "core" : "specific"; system.value = selectedSystemId || systems[0]?.id || ""; type.value = assessmentType;
        root.querySelector("#system-picker-field").hidden = isCore;
        root.querySelector("#question-admin-list").innerHTML = questions.map(controls).join("") || '<p class="admin-panel">ไม่พบคำถามในขอบเขตนี้</p>';
        root.querySelectorAll("[data-preview]").forEach(button => button.addEventListener("click", () => {
            try { preview(readEditor(button.closest(".question-editor"))); }
            catch (error) { setStatus(error.message, true); }
        }));
        scope.addEventListener("change", () => { isCore = scope.value === "core"; loadQuestions(); });
        system.addEventListener("change", () => { selectedSystemId = system.value; loadQuestions(); });
        type.addEventListener("change", () => { assessmentType = type.value; loadQuestions(); });
        root.querySelector("#question-add").addEventListener("click", () => {
            const newQuestion = normalize({ id: `custom_${isCore ? "core" : system.value}_${assessmentType}_${Date.now()}`, indicator_group: isCore ? "core" : "specific", section: isCore ? "core" : "specific", text: "", answer_type: "rating5", step: 3, order: questions.length + 1, options: [], roles: [], visible_when: { all: [] }, active: true }, questions.length);
            questions.push(newQuestion); draw();
        });
        root.querySelector("#question-save").addEventListener("click", save);
        root.querySelector("#optionset-add").addEventListener("click", () => { optionSets.push({ id: `options_${Date.now()}`, systemId: isCore ? null : selectedSystemId, options: [], valuesBySystem: {}, valuesByRole: {}, dependsOn: [] }); draw(); root.querySelector(".optionset-manager").open = true; });
        root.querySelector("#optionset-save").addEventListener("click", saveOptionSets);
    }

    function setStatus(message, error = false) {
        const status = root.querySelector("#question-admin-status");
        if (status) { status.textContent = message; status.classList.toggle("error", error); }
    }

    async function loadQuestions() {
        const scope = root.querySelector("#question-scope");
        isCore = scope?.value === "core";
        assessmentType = root.querySelector("#question-type")?.value || assessmentType;
        const systemId = root.querySelector("#question-system")?.value || selectedSystemId || systems[0]?.id;
        selectedSystemId = systemId;
        setStatus("กำลังโหลดคำถามจากคลังกลาง…");
        try {
            const [result, optionSetsResult] = await Promise.all([window.EvaluationAPI.getAdminQuestions(systemId, assessmentType), window.EvaluationAPI.getOptionSets(systemId)]);
            optionSets = optionSetsResult || [];
            questions = result.filter(question => isCore ? question.indicator_group === "core" : question.indicator_group === "specific").map(normalize);
            draw();
            setStatus(`${questions.length} คำถาม · ข้อมูลจากฐานข้อมูล${window.EvaluatorDemo?.active ? "ตัวอย่าง (อ่านอย่างเดียว)" : ""}`);
        } catch (error) { setStatus(`โหลดคำถามไม่สำเร็จ: ${error.message}`, true); }
    }

    async function save() {
        if (busy || window.EvaluatorDemo?.active) return;
        let values;
        try {
            values = [...root.querySelectorAll(".question-editor")].map(readEditor);
            for (const q of values) {
                if (!q.text || !Number.isInteger(q.step) || q.step < 1 || q.step > 4 || !Number.isInteger(q.order) || q.order < 1) throw new Error(`ตรวจข้อความ ขั้น และลำดับของ ${q.id}`);
                if (!Array.isArray(q.roles) || !Array.isArray(q.options) || typeof q.visible_when !== "object" || Array.isArray(q.visible_when) || typeof q.metadata !== "object" || Array.isArray(q.metadata)) throw new Error(`ฟิลด์ JSON ของ ${q.id} มีรูปแบบไม่ถูกต้อง`);
            }
        } catch (error) { setStatus(error.message, true); return; }
        busy = true; root.querySelector("#question-save").disabled = true; setStatus("กำลังบันทึกเวอร์ชันใหม่…");
        try {
            if (isCore) await window.EvaluationAPI.replaceCoreQuestions(assessmentType, values);
            else await window.EvaluationAPI.replaceQuestions(root.querySelector("#question-system").value, assessmentType, values);
            await loadQuestions(); setStatus("บันทึกแล้ว แบบประเมินใหม่จะใช้เวอร์ชันนี้ ส่วนผลเดิมยังอ้างอิงเวอร์ชันที่ตอบไว้");
        } catch (error) { setStatus(`บันทึกไม่สำเร็จ: ${error.message}`, true); }
        finally { busy = false; if (!window.EvaluatorDemo?.active) root.querySelector("#question-save")?.removeAttribute("disabled"); }
    }

    async function saveOptionSets() {
        if (busy || window.EvaluatorDemo?.active) return;
        try {
            const values = [...root.querySelectorAll("[data-optionset-index]")].map((editor, index) => {
                const original = optionSets[index];
                const parsed = name => { try { return JSON.parse(editor.querySelector(`[data-options="${name}"]`).value || (name === "options" ? "[]" : name === "dependsOn" ? "[]" : "{}")); } catch { throw new Error(`ชุด ${original.id}: ${name} ต้องเป็น JSON ที่ถูกต้อง`); } };
                const options = parsed("options"), valuesBySystem = parsed("valuesBySystem"), valuesByRole = parsed("valuesByRole"), dependsOn = parsed("dependsOn");
                if (!Array.isArray(options) || !dependsOn || typeof dependsOn !== "object" || !valuesBySystem || typeof valuesBySystem !== "object" || Array.isArray(valuesBySystem) || !valuesByRole || typeof valuesByRole !== "object" || Array.isArray(valuesByRole)) throw new Error(`ชุด ${original.id}: ตรวจชนิดข้อมูล options/values/dependsOn`);
                return { ...original, options, valuesBySystem, valuesByRole, dependsOn };
            });
            await window.EvaluationAPI.replaceOptionSets(selectedSystemId, values);
            await loadQuestions(); setStatus(`บันทึกชุดตัวเลือก ${values.length} ชุดแล้ว`);
        } catch (error) { setStatus(`บันทึกชุดตัวเลือกไม่สำเร็จ: ${error.message}`, true); }
    }

    (async function init() {
        try {
            await window.AdminGuard.ready;
            systems = await window.EvaluationAPI.getSystems();
            if (!systems.length) throw new Error("ไม่พบระบบที่เปิดใช้งาน");
            selectedSystemId = new URLSearchParams(location.search).get("system") || systems[0].id;
            isCore = new URLSearchParams(location.search).get("scope") === "core";
            draw(); await loadQuestions();
        } catch (error) { root.innerHTML = `<p class="admin-state error" role="alert">เปิดคลังคำถามไม่ได้: ${esc(error.message)}</p>`; }
    })();
})();
