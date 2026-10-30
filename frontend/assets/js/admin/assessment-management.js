/**
 * IT Evaluator - Assessment Management Controller (Admin)
 * Faculty of Allied Health Sciences, Naresuan University
 *
 * Hierarchy:
 *  Level 1: Main Category (หมวดหมู่หลัก - from systems-data.js)
 *  Level 2: Assessment Topic (หัวข้อการประเมิน / ระบบ IT)
 *  Level 3: Questions (ข้อคำถามการประเมินประสิทธิภาพและความพึงพอใจ)
 */

(function () {
    "use strict";

    let state = {
        selectedCategoryId: "personnel",
        selectedTopicId: null, // null = Topics view; string (systemId) = Questions view
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

    function getCategories() {
        return getCatalog() ? getCatalog().getCategories() : (window.categories || []);
    }

    function getSelectedCategory() {
        return getCategories().find(c => c.id === state.selectedCategoryId) || getCategories()[0] || null;
    }

    function getSelectedTopic() {
        if (!state.selectedTopicId) return null;
        for (const cat of getCategories()) {
            const found = (cat.systems || []).find(s => s.id === state.selectedTopicId);
            if (found) return found;
        }
        return null;
    }

    /* =====================================================================
       RENDER LOGIC
       ===================================================================== */

    function render() {
        renderHierarchyStepper();
        renderCategoryPills();

        if (state.selectedTopicId === null) {
            renderTopicsPanel();
        } else {
            renderQuestionsPanel();
        }
    }

    function renderHierarchyStepper() {
        const cat = getSelectedCategory();
        const catName = cat ? (window.getCategoryName ? window.getCategoryName(cat) : cat.name) : "";
        const topic = getSelectedTopic();
        const topicName = topic ? (window.getSystemName ? window.getSystemName(topic) : topic.name) : "";

        const stepperEl = document.getElementById("mgmtHierarchyStepper");
        if (!stepperEl) return;

        let html = `
            <div class="hierarchy-step active">
                <span class="step-num">1</span>
                <span>${t("mgmt_level1")}: <strong>${catName || "-"}</strong></span>
            </div>
            <span class="hierarchy-separator">/</span>
            <div class="hierarchy-step ${state.selectedTopicId ? "active" : ""}">
                <span class="step-num">2</span>
                <span>${t("mgmt_level2")}${topicName ? `: <strong>${topicName}</strong>` : ""}</span>
            </div>
        `;

        if (state.selectedTopicId) {
            html += `
                <span class="hierarchy-separator">/</span>
                <div class="hierarchy-step active">
                    <span class="step-num">3</span>
                    <span>${t("mgmt_level3")}</span>
                </div>
            `;
        }

        stepperEl.innerHTML = html;
    }

    function renderCategoryPills() {
        const container = document.getElementById("mgmtCategoryPills");
        if (!container) return;

        const categories = getCategories();
        container.innerHTML = "";

        categories.forEach(cat => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `category-pill ${cat.id === state.selectedCategoryId ? "active" : ""}`;
            btn.setAttribute("data-cat-id", cat.id);

            const displayName = window.getCategoryName ? window.getCategoryName(cat) : cat.name;
            const topicCount = (cat.systems || []).length;

            btn.innerHTML = `
                <span class="cat-name">${displayName}</span>
                <span class="cat-count">${topicCount} ${t("items_count", { count: topicCount }).replace(String(topicCount), "").trim() || "รายการ"}</span>
            `;

            btn.addEventListener("click", () => {
                state.selectedCategoryId = cat.id;
                state.selectedTopicId = null;
                render();
            });

            container.appendChild(btn);
        });
    }

    function renderTopicsPanel() {
        const topicsPanel = document.getElementById("mgmtTopicsPanel");
        const questionsPanel = document.getElementById("mgmtQuestionsPanel");
        if (topicsPanel) topicsPanel.style.display = "block";
        if (questionsPanel) questionsPanel.style.display = "none";

        const cat = getSelectedCategory();
        const catTitleEl = document.getElementById("mgmtSelectedCatTitle");
        if (catTitleEl && cat) {
            const displayName = window.getCategoryName ? window.getCategoryName(cat) : cat.name;
            catTitleEl.textContent = `${t("mgmt_topics_title")} ${displayName}`;
        }

        const tbody = document.getElementById("mgmtTopicsTableBody");
        const emptyEl = document.getElementById("mgmtTopicsEmpty");
        if (!tbody) return;

        const systems = cat && cat.systems ? cat.systems : [];

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
            const questions = getCatalog() ? getCatalog().getQuestions(sys.id) : [];

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
                        ${questions.length} ${t("mgmt_level3")}
                    </span>
                </td>
                <td class="mgmt-actions-cell" style="width: 280px;">
                    <div class="mgmt-btn-group">
                        <button type="button" class="btn-icon-text primary btn-manage-q" data-id="${sys.id}" title="${t("mgmt_btn_manage_q")}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                            <span>${t("mgmt_btn_manage_q")}</span>
                        </button>
                        <button type="button" class="btn-icon-text secondary btn-rename-topic" data-id="${sys.id}" title="${t("mgmt_btn_rename")}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            <span>${t("mgmt_btn_rename")}</span>
                        </button>
                        <button type="button" class="btn-icon-text danger btn-delete-topic" data-id="${sys.id}" data-name="${sys.name}" title="${t("mgmt_btn_delete")}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            <span>${t("mgmt_btn_delete")}</span>
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

        const cat = getSelectedCategory();
        const catName = cat ? (window.getCategoryName ? window.getCategoryName(cat) : cat.name) : "";
        const topic = getSelectedTopic();
        const topicName = topic ? (window.getSystemName ? window.getSystemName(topic) : topic.name) : "";

        const contextInfoEl = document.getElementById("mgmtTopicContextInfo");
        if (contextInfoEl && topic) {
            contextInfoEl.innerHTML = `
                <span>${catName} &rsaquo; <strong>${topicName}</strong></span>
                <span class="mgmt-code-badge">${topic.id}</span>
            `;
        }

        const questions = getCatalog() ? getCatalog().getQuestions(state.selectedTopicId) : [];
        const countBadge = document.getElementById("mgmtTopicQuestionsCountBadge");
        if (countBadge) {
            countBadge.textContent = `${questions.length} ${t("mgmt_level3")}`;
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

        questions.forEach((q, idx) => {
            const tr = document.createElement("tr");

            let typeLabel = t("mgmt_type_custom");
            let typeClass = "custom";
            if (q.type === "efficiency") {
                typeLabel = t("mgmt_type_efficiency");
                typeClass = "efficiency";
            } else if (q.type === "satisfaction") {
                typeLabel = t("mgmt_type_satisfaction");
                typeClass = "satisfaction";
            }

            const qText = (getLang() === "en" && q.text_en) ? q.text_en : q.text;
            const qSubText = (getLang() === "th" && q.text_en) ? q.text_en : (getLang() === "en" && q.text ? q.text : "");

            tr.innerHTML = `
                <td style="width: 60px; text-align: center; font-weight: 600; color: var(--text-secondary);">${q.order || (idx + 1)}</td>
                <td>
                    <div style="font-weight: 500; color: var(--text-primary); line-height: 1.4;">${qText}</div>
                    ${qSubText ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${qSubText}</div>` : ""}
                </td>
                <td style="width: 170px;">
                    <span class="mgmt-type-badge ${typeClass}">${typeLabel}</span>
                </td>
                <td style="width: 140px; color: var(--text-muted); font-size: 0.78rem;">
                    1 - 5 (${t("mgmt_level3")})
                </td>
                <td class="mgmt-actions-cell" style="width: 160px;">
                    <div class="mgmt-btn-group">
                        <button type="button" class="btn-icon-text secondary btn-edit-q" data-id="${q.id}" title="${t("mgmt_btn_edit_q")}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            <span>${t("mgmt_btn_edit_q")}</span>
                        </button>
                        <button type="button" class="btn-icon-text danger btn-delete-q" data-id="${q.id}" data-text="${q.text}" title="${t("mgmt_btn_delete_q")}">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            <span>${t("mgmt_btn_delete_q")}</span>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

        tbody.querySelectorAll(".btn-edit-q").forEach(btn => {
            btn.addEventListener("click", () => {
                const qId = btn.getAttribute("data-id");
                openQuestionModal(qId);
            });
        });

        tbody.querySelectorAll(".btn-delete-q").forEach(btn => {
            btn.addEventListener("click", () => {
                const qId = btn.getAttribute("data-id");
                const text = btn.getAttribute("data-text");
                openDeleteModal("question", qId, text);
            });
        });
    }

    /* =====================================================================
       TOPIC MODAL (Add / Rename)
       ===================================================================== */

    function openTopicModal(topicId = null) {
        state.editingTopicId = topicId;
        const modal = document.getElementById("mgmtTopicModal");
        const titleEl = document.getElementById("mgmtTopicModalTitle");
        const catBadgeEl = document.getElementById("mgmtTopicModalCatBadge");
        const codeInput = document.getElementById("mgmtTopicCodeInput");
        const nameThInput = document.getElementById("mgmtTopicNameThInput");
        const nameEnInput = document.getElementById("mgmtTopicNameEnInput");

        const cat = getSelectedCategory();
        const catName = cat ? (window.getCategoryName ? window.getCategoryName(cat) : cat.name) : "";
        if (catBadgeEl) catBadgeEl.textContent = catName;

        if (topicId) {
            // Rename Topic
            if (titleEl) titleEl.textContent = t("mgmt_modal_rename_topic_title");
            const topic = getCatalog() ? getCategories().flatMap(c => c.systems || []).find(s => s.id === topicId) : null;
            if (topic) {
                if (codeInput) {
                    codeInput.value = topic.id;
                    codeInput.readOnly = true;
                }
                if (nameThInput) nameThInput.value = topic.name || "";
                if (nameEnInput) nameEnInput.value = topic.name_en || "";
            }
        } else {
            // Add Topic
            if (titleEl) titleEl.textContent = t("mgmt_modal_add_topic_title");
            if (codeInput) {
                codeInput.value = getCatalog() ? getCatalog().generateNextSystemId() : "SYS099";
                codeInput.readOnly = false;
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

    function saveTopicFromModal() {
        const codeInput = document.getElementById("mgmtTopicCodeInput");
        const nameThInput = document.getElementById("mgmtTopicNameThInput");
        const nameEnInput = document.getElementById("mgmtTopicNameEnInput");

        const id = codeInput ? codeInput.value.trim() : "";
        const name = nameThInput ? nameThInput.value.trim() : "";
        const name_en = nameEnInput ? nameEnInput.value.trim() : "";

        if (!name) {
            alert(t("mgmt_alert_fill_required"));
            if (nameThInput) nameThInput.focus();
            return;
        }

        if (state.editingTopicId) {
            getCatalog().renameTopic(state.editingTopicId, { name, name_en });
        } else {
            getCatalog().addTopic(state.selectedCategoryId, { id, name, name_en });
        }

        closeTopicModal();
        render();
    }

    /* =====================================================================
       QUESTION MODAL (Add / Edit)
       ===================================================================== */

    function openQuestionModal(questionId = null) {
        state.editingQuestionId = questionId;
        const modal = document.getElementById("mgmtQuestionModal");
        const titleEl = document.getElementById("mgmtQuestionModalTitle");
        const orderInput = document.getElementById("mgmtQuestionOrderInput");
        const typeSelect = document.getElementById("mgmtQuestionTypeSelect");
        const textThInput = document.getElementById("mgmtQuestionTextThInput");
        const textEnInput = document.getElementById("mgmtQuestionTextEnInput");
        const scaleSelect = document.getElementById("mgmtQuestionScaleSelect");

        const currentQuestions = getCatalog().getQuestions(state.selectedTopicId);

        if (questionId) {
            if (titleEl) titleEl.textContent = t("mgmt_modal_edit_q_title");
            const q = currentQuestions.find(item => item.id === questionId);
            if (q) {
                if (orderInput) orderInput.value = q.order || "";
                if (typeSelect) typeSelect.value = q.type || "efficiency";
                if (textThInput) textThInput.value = q.text || "";
                if (textEnInput) textEnInput.value = q.text_en || "";
                if (scaleSelect) scaleSelect.value = q.scale || "likert5";
            }
        } else {
            if (titleEl) titleEl.textContent = t("mgmt_modal_add_q_title");
            if (orderInput) orderInput.value = currentQuestions.length + 1;
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

    function saveQuestionFromModal() {
        const orderInput = document.getElementById("mgmtQuestionOrderInput");
        const typeSelect = document.getElementById("mgmtQuestionTypeSelect");
        const textThInput = document.getElementById("mgmtQuestionTextThInput");
        const textEnInput = document.getElementById("mgmtQuestionTextEnInput");
        const scaleSelect = document.getElementById("mgmtQuestionScaleSelect");

        const order = parseInt(orderInput ? orderInput.value : "1", 10) || 1;
        const type = typeSelect ? typeSelect.value : "efficiency";
        const text = textThInput ? textThInput.value.trim() : "";
        const text_en = textEnInput ? textEnInput.value.trim() : "";
        const scale = scaleSelect ? scaleSelect.value : "likert5";

        if (!text) {
            alert(t("mgmt_alert_fill_required"));
            if (textThInput) textThInput.focus();
            return;
        }

        getCatalog().saveQuestion(state.selectedTopicId, {
            id: state.editingQuestionId || null,
            order,
            type,
            text,
            text_en,
            scale
        });

        closeQuestionModal();
        render();
    }

    /* =====================================================================
       DELETE CONFIRMATION MODAL
       ===================================================================== */

    function openDeleteModal(type, id, name) {
        state.pendingDelete = { type, id, name };
        const modal = document.getElementById("mgmtDeleteModal");
        const titleEl = document.getElementById("mgmtDeleteModalTitle");
        const msgEl = document.getElementById("mgmtDeleteModalMessage");

        if (type === "topic") {
            if (titleEl) titleEl.textContent = t("mgmt_confirm_delete_topic_title");
            if (msgEl) msgEl.textContent = t("mgmt_confirm_delete_topic_msg", { name });
        } else {
            if (titleEl) titleEl.textContent = t("mgmt_confirm_delete_q_title");
            if (msgEl) msgEl.textContent = t("mgmt_confirm_delete_q_msg", { text: name });
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

        if (state.pendingDelete.type === "topic") {
            getCatalog().deleteTopic(state.pendingDelete.id);
            if (state.selectedTopicId === state.pendingDelete.id) {
                state.selectedTopicId = null;
            }
        } else if (state.pendingDelete.type === "question") {
            getCatalog().deleteQuestion(state.selectedTopicId, state.pendingDelete.id);
        }

        closeDeleteModal();
        render();
    }

    /* =====================================================================
       RESET DEFAULTS
       ===================================================================== */

    function handleResetDefaults() {
        const confirmed = window.confirm(t("mgmt_confirm_reset_msg"));
        if (!confirmed) return;

        getCatalog().resetDefaults();
        state.selectedTopicId = null;
        render();
    }

    /* =====================================================================
       INITIALIZATION
       ===================================================================== */

    function init() {
        // Back to topics button
        const backBtn = document.getElementById("mgmtBackToTopicsBtn");
        if (backBtn) {
            backBtn.addEventListener("click", () => {
                state.selectedTopicId = null;
                render();
            });
        }

        // Add topic button
        const addTopicBtn = document.getElementById("mgmtAddTopicBtn");
        if (addTopicBtn) {
            addTopicBtn.addEventListener("click", () => openTopicModal(null));
        }

        // Add question button
        const addQuestionBtn = document.getElementById("mgmtAddQuestionBtn");
        if (addQuestionBtn) {
            addQuestionBtn.addEventListener("click", () => openQuestionModal(null));
        }

        // Reset defaults button
        const resetBtn = document.getElementById("mgmtResetDefaultsBtn");
        if (resetBtn) {
            resetBtn.addEventListener("click", handleResetDefaults);
        }

        // Topic modal buttons
        const closeTopicModalBtn = document.getElementById("closeTopicModal");
        if (closeTopicModalBtn) closeTopicModalBtn.addEventListener("click", closeTopicModal);

        const cancelTopicModalBtn = document.getElementById("cancelTopicModalBtn");
        if (cancelTopicModalBtn) cancelTopicModalBtn.addEventListener("click", closeTopicModal);

        const saveTopicBtn = document.getElementById("saveTopicBtn");
        if (saveTopicBtn) saveTopicBtn.addEventListener("click", saveTopicFromModal);

        // Question modal buttons
        const closeQuestionModalBtn = document.getElementById("closeQuestionModal");
        if (closeQuestionModalBtn) closeQuestionModalBtn.addEventListener("click", closeQuestionModal);

        const cancelQuestionModalBtn = document.getElementById("cancelQuestionModalBtn");
        if (cancelQuestionModalBtn) cancelQuestionModalBtn.addEventListener("click", closeQuestionModal);

        const saveQuestionBtn = document.getElementById("saveQuestionBtn");
        if (saveQuestionBtn) saveQuestionBtn.addEventListener("click", saveQuestionFromModal);

        // Delete modal buttons
        const closeDeleteModalBtn = document.getElementById("closeDeleteModal");
        if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener("click", closeDeleteModal);

        const cancelDeleteModalBtn = document.getElementById("cancelDeleteModalBtn");
        if (cancelDeleteModalBtn) cancelDeleteModalBtn.addEventListener("click", closeDeleteModal);

        const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
        if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", confirmDelete);

        // Language change listener
        document.addEventListener("langchange", () => render());

        // Assessment catalog change listener
        document.addEventListener("assessmentcatalogchange", () => render());

        // Initial render
        render();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Expose for testing
    window.AssessmentManagementController = {
        getState: () => state,
        render,
        openTopicModal,
        openQuestionModal,
        openDeleteModal
    };
})();
