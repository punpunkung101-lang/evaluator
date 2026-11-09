(function () {
    "use strict";
    const root = document.getElementById("admin-overview");
    if (!root) return;
    const t = (key, params = {}) => {
        const language = document.documentElement.lang === "en" ? "en" : "th";
        let value = window.ThemeLang?.i18n?.[language]?.[key] || key;
        for (const [name, replacement] of Object.entries(params)) value = value.replace("{" + name + "}", replacement);
        return value;
    };
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const dateValue = record => record.submittedAt || record.submitted_at || "";
    function formatDate(value) {
        if (!value) return t("admin_last_updated_none");
        const date = new Date(value);
        return Number.isNaN(date.valueOf()) ? esc(value) : new Intl.DateTimeFormat(document.documentElement.lang === "en" ? "en" : "th", { dateStyle: "medium", timeStyle: "short" }).format(date);
    }
    function statePanel(kind, error) {
        if (kind === "loading") return '<p class="admin-state" role="status">' + t("admin_loading") + "</p>";
        if (kind === "error") return '<div class="admin-state error" role="alert"><p>' + t("admin_load_error") + ": " + esc(error) + '</p><button type="button" class="admin-retry">' + t("admin_retry") + "</button></div>";
        return '<p class="admin-state">' + t("admin_no_records") + "</p>";
    }
    function resultLabel(result) {
        const keys = { preliminary: "admin_preliminary", "after-better": "admin_after_better", "before-better": "admin_before_better", similar: "admin_similar", "no-data": "admin_no_records" };
        return t(keys[result] || "admin_no_records");
    }
    function render(data, qStatus, evalStatus) {
        if (!data) {
            root.innerHTML = statePanel("loading");
            return;
        }
        const model = window.AdminOverviewModel.compute(data.systems, data.quant, data.evaluations);
        const statusText = (status, records) => status.status === "rejected" ? t("admin_load_error") + ": " + esc(status.reason.message) : records.length ? t("admin_status_ready") : t("admin_status_missing");
        const systemRows = model.systems.map(system => {
            const quant = model.quantBySystem.get(system.id) || [];
            const sat = model.satisfactionBySystem.get(system.id) || [];
            const summary = quant.length ? window.EffectivenessScoring.summarizeSystem(quant, window.EffectivenessExamples.metrics) : { summary: "no-data" };
            const dest = new URL(window.EvaluatorRuntimeUrl.fromScript("../../../admin/results.html", document.querySelector('script[src$="admin-overview.js"]').src));
            dest.searchParams.set("system", system.id);
            return '<tr><th scope="row">' + esc(system.name || system.id) + ' <small>' + esc(system.id) + '</small></th><td>' + statusText(qStatus, quant) + '</td><td>' + statusText(evalStatus, sat) + '</td><td>' + resultLabel(summary.summary) + '</td><td><a class="admin-link" href="' + dest.href + '">' + t("admin_open_results") + "</a></td></tr>";
        }).join("");
        const recentRows = model.latest.slice(0, 8).map(record => {
            const id = record.systemId || record.system_id;
            const system = data.systems.find(item => item.id === id);
            const key = record.dataType === "effectiveness" ? "admin_recent_type_effectiveness" : "admin_recent_type_satisfaction";
            return "<li><span>" + esc(t("admin_recent_system", { system: system?.name || id })) + '</span><span class="admin-tag">' + t(key) + "</span><time>" + formatDate(dateValue(record)) + "</time></li>";
        }).join("");
        const noRows = model.systems.length === 0;
        root.innerHTML =
            '<div class="admin-kpi-grid">' +
            '<article class="admin-kpi"><h2>' + t("admin_card_systems") + "</h2><p>" + model.systems.length + "</p></article>" +
            '<article class="admin-kpi"><h2>' + t("admin_card_effectiveness") + "</h2><p>" + (qStatus.status === "fulfilled" ? model.realQuant.length : "—") + "</p></article>" +
            '<article class="admin-kpi"><h2>' + t("admin_card_satisfaction") + "</h2><p>" + (evalStatus.status === "fulfilled" ? model.evaluations.length : "—") + "</p></article>" +
            '<article class="admin-kpi"><h2>' + t("admin_card_evaluators") + "</h2><p>" + model.evaluators.size + "</p><small>" + t("admin_card_updated") + ": " + formatDate(model.latestDate) + "</small></article></div>" +
            (model.excludedDemo ? '<p class="admin-state notice">' + t("admin_excluded_demo") + ": " + model.excludedDemo + "</p>" : "") +
            '<section class="admin-panel"><h2>' + t("admin_system_table") + "</h2>" +
            (noRows ? statePanel(qStatus.status === "rejected" && evalStatus.status === "rejected" ? "error" : "empty", qStatus.reason?.message || evalStatus.reason?.message || "") :
                '<div class="admin-table-wrap"><table><thead><tr><th>' + t("admin_system_name") + "</th><th>" + t("admin_effectiveness_status") + "</th><th>" + t("admin_satisfaction_status") + "</th><th>" + t("admin_result_summary") + '</th><th></th></tr></thead><tbody>' + systemRows + "</tbody></table></div>") +
            '</section><section class="admin-panel"><h2>' + t("admin_recent_title") + "</h2>" +
            (recentRows ? '<ul class="admin-recent-list">' + recentRows + "</ul>" : statePanel("empty")) + "</section>";
        if (qStatus.status === "rejected" || evalStatus.status === "rejected") {
            root.insertAdjacentHTML("afterbegin", '<div class="admin-state error" role="alert"><p>' + t("admin_load_error") + ': ' + [qStatus, evalStatus].filter(item => item.status === "rejected").map(item => esc(item.reason.message)).join("; ") + '</p><button type="button" class="admin-retry">' + t("admin_retry") + "</button></div>");
        }
        root.querySelector(".admin-retry")?.addEventListener("click", load);
    }
    async function load() {
        render(null);
        const results = await window.AdminData.fromWindow().load();
        const systems = results.systems.status === "fulfilled" ? results.systems.value : window.AssessmentCatalog?.getSystems?.() || window.systems || [];
        const qStatus = results.effectiveness, evalStatus = results.satisfaction;
        render({
            systems,
            quant: qStatus.status === "fulfilled" ? qStatus.value : [],
            evaluations: evalStatus.status === "fulfilled" ? evalStatus.value : []
        }, qStatus, evalStatus);
        if (Object.values(results).every(result => result.status === "rejected")) {
            root.innerHTML = statePanel("error", Object.values(results).map(result => result.reason.message).join("; "));
            root.querySelector(".admin-retry")?.addEventListener("click", load);
        }
    }
    document.addEventListener("langchange", load);
    load();
    if (typeof module === "object" && module.exports) module.exports = { compute };
})();
