/**
 * IT Evaluator - Assessment Management Controller (Admin)
 * Faculty of Allied Health Sciences, Naresuan University
 *
 * Direct Hierarchy:
 *  Level 1: IT System (ระบบสารสนเทศที่รับการประเมิน)
 *  Level 2: Questions (ข้อคำถามการประเมินประสิทธิภาพและความพึงพอใจ)
 */

(function () {
    "use strict";

    let state = {
        selectedTopicId: null, // null = Systems view; string (systemId) = Questions view
        editingTopicId: null,
        editingQuestionId: null,
        pendingDelete: null // { type: 'topic' | 'question', id: string, name: string }
    };

    function t(key, params) {
        if (window.ThemeLang && window.ThemeLang.t) {
            return window.ThemeLang.t(key, params);
        }
        return key;
    }

    function getLang() {
        return window.ThemeLang ? window.ThemeLang.getLang() : (localStorage.getItem("it_eval_lang") || "th");
    }

    function getCatalog() {
        return window.AssessmentCatalog;
    }

    function getSystems() {
        return getCatalog() ? getCatalog().getSystems() : (window.systems || []);
    }

    function getSelectedTopic() {
        if (!state.selectedTopicId) return null;
        return getSystems().find(s => s.id === state.selectedTopicId) || null;
    }

    /* =====================================================================
       RENDER LOGIC
       ===================================================================== */

    function render() {
        renderHierarchyStepper();

        if (state.selectedTopicId === null) {
            renderTopicsPanel();
        } else {
            renderQuestionsPanel();
        }
    }

    function renderHierarchyStepper() {
        const systems = getSystems();
        const topic = getSelectedTopic();
        const topicName = topic ? (window.getSystemName ? window.getSystemName(topic) : topic.name) : "";

        const stepperEl = document.getElementById("mgmtHierarchyStepper");
        if (!stepperEl) return;

        if (!state.selectedTopicId) {
            stepperEl.innerHTML = `
                <div class="hierarchy-step active">
                    <span class="step-num">1</span>
                    <span><strong>รายการระบบ IT ที่รับการประเมิน (${systems.length} ระบบ)</strong></span>
                </div>
            `;
        } else {
            stepperEl.innerHTML = `
                <div class="hierarchy-step" id="mgmtStepBackToSystems" style="cursor: pointer;" title="คลิกเพื่อย้อนกลับรายการระบบ">
                    <span class="step-num">1</span>
                    <span>รายการระบบ IT (${systems.length} ระบบ)</span>
                </div>
                <span class="hierarchy-separator">/</span>
                <div class="hierarchy-step active">
                    <span class="step-num">2</span>
                    <span>ข้อคำถามการประเมิน: <strong>${topicName} (${topic ? topic.id : ""})</strong></span>
                </div>
            `;

            const backStep = document.getElementById("mgmtStepBackToSystems");
            if (backStep) {
                backStep.addEventListener("click", () => {
                    state.selectedTopicId = null;
                    render();
                });
            }
        }
    }

    function renderTopicsPanel() {
        const topicsPanel = document.getElementById("mgmtTopicsPanel");
        const questionsPanel = document.getElementById("mgmtQuestionsPanel");
        if (topicsPanel) topicsPanel.style.display = "block";
        if (questionsPanel) questionsPanel.style.display = "none";

        const catTitleEl = document.getElementById("mgmtSelectedCatTitle");
        if (catTitleEl) {
            catTitleEl.textContent = "รายการระบบสารสนเทศทั้งหมด (IT Systems Directory)";
        }

        const tbody = document.getElementById("mgmtTopicsTableBody");
        const emptyEl = document.getElementById("mgmtTopicsEmpty");
        if (!tbody) return;

        const systems = getSystems();

        if (systems.length === 0) {
            tbody.innerHTML = "";
            if (emptyEl) emptyEl.style.display = "block";
            return;
        }

        if (emptyEl) emptyEl.style.display = "none";
        tbody.innerHTML = "";

        systems.forEach((sys, idx) => {
            const tr = document.createElement("tr");

            const displayName = window.getSystemName ? window.getSystemName(sys) : sys.name;
            const subName = (getLang() === "th" && sys.name_en) ? sys.name_en : (getLang() === "en" && sys.name ? sys.name : "");
            const questions = getCatalog() ? getCatalog().getQuestionsForTopic(sys.id) : [];

            tr.innerHTML = `
                <td style="width: 50px; text-align: center; color: var(--text-muted);">${idx + 1}</td>
                <td style="width: 120px;">
                    <span class="mgmt-code-badge">${sys.id}</span>
                </td>
                <td>
                    <strong>${displayName}</strong>
                    ${subName ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${subName}</div>` : ""}
                </td>
                <td style="width: 160px;">
                    <span class="mgmt-q-badge">
                        <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; fill: currentColor;" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                        ${questions.length} ข้อคำถาม
                    </span>
                </td>
                <td class="mgmt-actions-cell" style="width: 280px;">
                    <div class="mgmt-btn-group">
                        <button type="button" class="btn-icon-text primary btn-manage-q" data-id="${sys.id}" title="${t("mgmt_btn_manage_q")}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                            <span>จัดการข้อคำถาม</span>
                        </button>
                        <button type="button" class="btn-icon-text secondary btn-rename-topic" data-id="${sys.id}" title="${t("mgmt_btn_rename")}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            <span>แก้ไข</span>
                        </button>
                        <button type="button" class="btn-icon-text danger btn-delete-topic" data-id="${sys.id}" data-name="${sys.name}" title="${t("mgmt_btn_delete")}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            <span>ลบ</span>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Bind Row Buttons
        tbody.querySelectorAll(".btn-manage-q").forEach(btn => {
            btn.addEventListener("click", () => {
                const sysId = btn.getAttribute("data-id");
                state.selectedTopicId = sysId;
                render();
            });
        });

        tbody.querySelectorAll(".btn-rename-topic").forEach(btn => {
            btn.addEventListener("click", () => {
                const sysId = btn.getAttribute("data-id");
                openTopicModal(sysId);
            });
        });

        tbody.querySelectorAll(".btn-delete-topic").forEach(btn => {
            btn.addEventListener("click", () => {
                const sysId = btn.getAttribute("data-id");
                const name = btn.getAttribute("data-name");
                openDeleteModal("topic", sysId, name);
            });
        });
    }

    function renderQuestionsPanel() {
        const topicsPanel = document.getElementById("mgmtTopicsPanel");
        const questionsPanel = document.getElementById("mgmtQuestionsPanel");
        if (topicsPanel) topicsPanel.style.display = "none";
        if (questionsPanel) questionsPanel.style.display = "block";

        const topic = getSelectedTopic();
        const topicName = topic ? (window.getSystemName ? window.getSystemName(topic) : topic.name) : "";

        const contextInfoEl = document.getElementById("mgmtTopicContextInfo");
        if (contextInfoEl && topic) {
            contextInfoEl.innerHTML = `
                <span>ระบบ IT: <strong>${topicName}</strong></span>
                <span class="mgmt-code-badge">${topic.id}</span>
            `;
        }

        const questions = getCatalog() ? getCatalog().getQuestionsForTopic(state.selectedTopicId) : [];
        const countBadge = document.getElementById("mgmtTopicQuestionsCountBadge");
        if (countBadge) {
            countBadge.textContent = `${questions.length} ข้อคำถาม`;
        }

        const tbody = document.getElementById("mgmtQuestionsTableBody");
        const emptyEl = document.getElementById("mgmtQuestionsEmpty");
        if (!tbody) return;

        if (questions.length === 0) {
            tbody.innerHTML = "";
            if (emptyEl) emptyEl.style.display = "block";
            return;
        }

        if (emptyEl) emptyEl.style.display = "none";
        tbody.innerHTML = "";

        questions.forEach(q => {
            const tr = document.createElement("tr");

            const text = (getLang() === "en" && q.text_en) ? q.text_en : q.text;
            const subText = (getLang() === "th" && q.text_en) ? q.text_en : (getLang() === "en" && q.text ? q.text : "");

            let typeBadgeClass = "efficiency";
            let typeLabel = "เกณฑ์ประสิทธิภาพ";
            if (q.type === "satisfaction") {
                typeBadgeClass = "satisfaction";
                typeLabel = "เกณฑ์ความพึงพอใจ";
            } else if (q.type === "custom") {
                typeBadgeClass = "custom";
                typeLabel = "เกณฑ์เพิ่มเติม";
            }

            tr.innerHTML = `
                <td style="width: 60px; text-align: center; font-weight: 600; color: var(--text-muted);">${q.order}</td>
                <td>
                    <div><strong>${text}</strong></div>
                    ${subText ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${subText}</div>` : ""}
                </td>
                <td style="width: 170px;">
                    <span class="q-type-badge ${typeBadgeClass}">${typeLabel}</span>
                </td>
                <td style="width: 140px; color: var(--text-secondary); font-size: 0.8125rem;">
                    สเกล 5 ระดับ (1-5)
                </td>
                <td class="mgmt-actions-cell" style="width: 160px;">
                    <div class="mgmt-btn-group">
                        <button type="button" class="btn-icon-text secondary btn-edit-q" data-id="${q.id}" title="${t("edit")}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            <span>แก้ไข</span>
                        </button>
                        <button type="button" class="btn-icon-text danger btn-delete-q" data-id="${q.id}" data-name="${text}" title="${t("mgmt_btn_delete")}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            <span>ลบ</span>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Bind Question Actions
        tbody.querySelectorAll(".btn-edit-q").forEach(btn => {
            btn.addEventListener("click", () => {
                const qId = btn.getAttribute("data-id");
                openQuestionModal(qId);
            });
        });

        tbody.querySelectorAll(".btn-delete-q").forEach(btn => {
            btn.addEventListener("click", () => {
                const qId = btn.getAttribute("data-id");
                const name = btn.getAttribute("data-name");
                openDeleteModal("question", qId, name);
            });
        });
    }

    /* =====================================================================
       MODAL CONTROLLERS
       ===================================================================== */

    // --- Topic / System Modal ---
    function openTopicModal(systemIdToEdit) {
        state.editingTopicId = systemIdToEdit || null;

        const modal = document.getElementById("mgmtTopicModal");
        const titleEl = document.getElementById("mgmtTopicModalTitle");
        const codeInput = document.getElementById("mgmtTopicCodeInput");
        const nameThInput = document.getElementById("mgmtTopicNameThInput");
        const nameEnInput = document.getElementById("mgmtTopicNameEnInput");

        if (systemIdToEdit) {
            const sys = getSystems().find(s => s.id === systemIdToEdit);
            if (titleEl) titleEl.textContent = "แก้ไขข้อมูลระบบสารสนเทศ";
            if (codeInput) {
                codeInput.value = sys ? sys.id : "";
                codeInput.disabled = true;
            }
            if (nameThInput) nameThInput.value = sys ? sys.name : "";
            if (nameEnInput) nameEnInput.value = sys ? (sys.name_en || "") : "";
        } else {
            if (titleEl) titleEl.textContent = "เพิ่มระบบสารสนเทศใหม่";
            if (codeInput) {
                codeInput.value = getCatalog() ? getCatalog().generateNextSystemId() : "";
                codeInput.disabled = false;
            }
            if (nameThInput) nameThInput.value = "";
            if (nameEnInput) nameEnInput.value = "";
        }

        if (modal) modal.classList.add("open");
        if (nameThInput) setTimeout(() => nameThInput.focus(), 100);
    }

    function closeTopicModal() {
        const modal = document.getElementById("mgmtTopicModal");
        if (modal) modal.classList.remove("open");
        state.editingTopicId = null;
    }

    function saveTopic() {
        const codeInput = document.getElementById("mgmtTopicCodeInput");
        const nameThInput = document.getElementById("mgmtTopicNameThInput");
        const nameEnInput = document.getElementById("mgmtTopicNameEnInput");

        const nameTh = (nameThInput?.value || "").trim();
        const nameEn = (nameEnInput?.value || "").trim();
        const code = (codeInput?.value || "").trim();

        if (!nameTh) {
            alert("กรุณากรอกชื่อระบบสารสนเทศ (ภาษาไทย)");
            nameThInput?.focus();
            return;
        }

        try {
            if (state.editingTopicId) {
                getCatalog().renameSystem(state.editingTopicId, { name: nameTh, name_en: nameEn });
            } else {
                getCatalog().addSystem({ id: code, name: nameTh, name_en: nameEn });
            }
            closeTopicModal();
            render();
        } catch (err) {
            alert(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    }

    // --- Question Modal ---
    function openQuestionModal(questionIdToEdit) {
        state.editingQuestionId = questionIdToEdit || null;

        const modal = document.getElementById("mgmtQuestionModal");
        const titleEl = document.getElementById("mgmtQuestionModalTitle");
        const orderInput = document.getElementById("mgmtQuestionOrderInput");
        const typeSelect = document.getElementById("mgmtQuestionTypeSelect");
        const textThInput = document.getElementById("mgmtQuestionTextThInput");
        const textEnInput = document.getElementById("mgmtQuestionTextEnInput");
        const scaleSelect = document.getElementById("mgmtQuestionScaleSelect");

        const qList = getCatalog().getQuestionsForTopic(state.selectedTopicId);

        if (questionIdToEdit) {
            const q = qList.find(item => item.id === questionIdToEdit);
            if (titleEl) titleEl.textContent = "แก้ไขข้อคำถาม";
            if (orderInput) orderInput.value = q ? q.order : 1;
            if (typeSelect) typeSelect.value = q ? q.type : "efficiency";
            if (textThInput) textThInput.value = q ? q.text : "";
            if (textEnInput) textEnInput.value = q ? (q.text_en || "") : "";
            if (scaleSelect) scaleSelect.value = q ? (q.scale || "likert5") : "likert5";
        } else {
            if (titleEl) titleEl.textContent = "เพิ่มข้อคำถามใหม่";
            if (orderInput) orderInput.value = qList.length + 1;
            if (typeSelect) typeSelect.value = "efficiency";
            if (textThInput) textThInput.value = "";
            if (textEnInput) textEnInput.value = "";
            if (scaleSelect) scaleSelect.value = "likert5";
        }

        if (modal) modal.classList.add("open");
        if (textThInput) setTimeout(() => textThInput.focus(), 100);
    }

    function closeQuestionModal() {
        const modal = document.getElementById("mgmtQuestionModal");
        if (modal) modal.classList.remove("open");
        state.editingQuestionId = null;
    }

    function saveQuestion() {
        const orderInput = document.getElementById("mgmtQuestionOrderInput");
        const typeSelect = document.getElementById("mgmtQuestionTypeSelect");
        const textThInput = document.getElementById("mgmtQuestionTextThInput");
        const textEnInput = document.getElementById("mgmtQuestionTextEnInput");
        const scaleSelect = document.getElementById("mgmtQuestionScaleSelect");

        const textTh = (textThInput?.value || "").trim();
        const textEn = (textEnInput?.value || "").trim();
        const type = typeSelect?.value || "efficiency";
        const scale = scaleSelect?.value || "likert5";
        const order = parseInt(orderInput?.value || "1", 10);

        if (!textTh) {
            alert("กรุณากรอกข้อความคำถาม (ภาษาไทย)");
            textThInput?.focus();
            return;
        }

        try {
            if (state.editingQuestionId) {
                getCatalog().updateQuestion(state.selectedTopicId, state.editingQuestionId, {
                    text: textTh,
                    text_en: textEn,
                    type,
                    scale,
                    order
                });
            } else {
                getCatalog().addQuestion(state.selectedTopicId, {
                    text: textTh,
                    text_en: textEn,
                    type,
                    scale,
                    order
                });
            }
            closeQuestionModal();
            render();
        } catch (err) {
            alert(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อคำถาม");
        }
    }

    // --- Delete Confirmation Modal ---
    function openDeleteModal(type, id, name) {
        state.pendingDelete = { type, id, name };

        const modal = document.getElementById("mgmtDeleteModal");
        const titleEl = document.getElementById("mgmtDeleteModalTitle");
        const msgEl = document.getElementById("mgmtDeleteModalMessage");

        if (type === "topic") {
            if (titleEl) titleEl.textContent = "ยืนยันการลบระบบสารสนเทศ";
            if (msgEl) {
                msgEl.textContent = `ท่านแน่ใจหรือไม่ว่าต้องการลบระบบสารสนเทศ "${name}" (${id}) ออกจากระบบ? การดำเนินการนี้จะลบข้อคำถามที่ผูกกับระบบนี้ทั้งหมดด้วย`;
            }
        } else {
            if (titleEl) titleEl.textContent = "ยืนยันการลบข้อคำถาม";
            if (msgEl) {
                msgEl.textContent = `ท่านแน่ใจหรือไม่ว่าต้องการลบข้อคำถาม "${name}" ออกจากระบบ?`;
            }
        }

        if (modal) modal.classList.add("open");
    }

    function closeDeleteModal() {
        const modal = document.getElementById("mgmtDeleteModal");
        if (modal) modal.classList.remove("open");
        state.pendingDelete = null;
    }

    function confirmDelete() {
        if (!state.pendingDelete) return;
        const { type, id } = state.pendingDelete;

        try {
            if (type === "topic") {
                getCatalog().deleteSystem(id);
                if (state.selectedTopicId === id) {
                    state.selectedTopicId = null;
                }
            } else if (type === "question") {
                getCatalog().deleteQuestion(state.selectedTopicId, id);
            }
            closeDeleteModal();
            render();
        } catch (err) {
            alert(err.message || "เกิดข้อผิดพลาดในการลบข้อมูล");
        }
    }

    /* =====================================================================
       INITIALIZATION & EVENT BINDINGS
       ===================================================================== */

    document.addEventListener("DOMContentLoaded", () => {
        // Add Topic / System Button
        const addTopicBtn = document.getElementById("mgmtAddTopicBtn");
        if (addTopicBtn) addTopicBtn.addEventListener("click", () => openTopicModal(null));

        // Close Topic Modal
        const closeTopicModalBtn = document.getElementById("closeTopicModal");
        const cancelTopicModalBtn = document.getElementById("cancelTopicModalBtn");
        if (closeTopicModalBtn) closeTopicModalBtn.addEventListener("click", closeTopicModal);
        if (cancelTopicModalBtn) cancelTopicModalBtn.addEventListener("click", closeTopicModal);

        // Save Topic
        const saveTopicBtn = document.getElementById("saveTopicBtn");
        if (saveTopicBtn) saveTopicBtn.addEventListener("click", saveTopic);

        // Back to Topics from Questions
        const backToTopicsBtn = document.getElementById("mgmtBackToTopicsBtn");
        if (backToTopicsBtn) {
            backToTopicsBtn.addEventListener("click", () => {
                state.selectedTopicId = null;
                render();
            });
        }

        // Add Question Button
        const addQuestionBtn = document.getElementById("mgmtAddQuestionBtn");
        if (addQuestionBtn) addQuestionBtn.addEventListener("click", () => openQuestionModal(null));

        // Close Question Modal
        const closeQuestionModalBtn = document.getElementById("closeQuestionModal");
        const cancelQuestionModalBtn = document.getElementById("cancelQuestionModalBtn");
        if (closeQuestionModalBtn) closeQuestionModalBtn.addEventListener("click", closeQuestionModal);
        if (cancelQuestionModalBtn) cancelQuestionModalBtn.addEventListener("click", closeQuestionModal);

        // Save Question
        const saveQuestionBtn = document.getElementById("saveQuestionBtn");
        if (saveQuestionBtn) saveQuestionBtn.addEventListener("click", saveQuestion);

        // Delete Modal Buttons
        const closeDeleteModalBtn = document.getElementById("closeDeleteModal");
        const cancelDeleteModalBtn = document.getElementById("cancelDeleteModalBtn");
        const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
        if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
        if (cancelDeleteModalBtn) cancelDeleteModalBtn.addEventListener("click", closeDeleteModal);
        if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", confirmDelete);

        // Reset Defaults Button
        const resetDefaultsBtn = document.getElementById("mgmtResetDefaultsBtn");
        if (resetDefaultsBtn) {
            resetDefaultsBtn.addEventListener("click", () => {
                if (confirm("ท่านแน่ใจหรือไม่ว่าต้องการคืนค่ารายชื่อระบบสารสนเทศและข้อคำถามทั้งหมดกลับเป็นค่าเริ่มต้น?")) {
                    getCatalog().resetAllToDefaults();
                    state.selectedTopicId = null;
                    render();
                }
            });
        }

        // Re-render on language change
        document.addEventListener("langchange", () => {
            render();
        });

        // Initial Render
        render();
    });

})();
