(function () {
    "use strict";
    const root = document.getElementById("admin-overview");
    if (!root) return;
    const scriptUrl = document.currentScript?.src || "";
    const t = (key, params = {}) => {
        const language = document.documentElement.lang === "en" ? "en" : "th";
        let value = window.ThemeLang?.i18n?.[language]?.[key] || key;
        for (const [name, replacement] of Object.entries(params)) value = value.replace("{" + name + "}", replacement);
        return value;
    };
    const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    const number = value => Number.isFinite(value) ? value.toFixed(1) : "—";
    const statusKey = Object.freeze({
        improve: "priority_status_improve",
        watch: "priority_status_watch",
        good: "priority_status_good",
        "no-data": "priority_status_no_data"
    });

    function statePanel(kind, error) {
        if (kind === "loading") return '<p class="admin-state" role="status">' + t("admin_loading") + "</p>";
        if (kind === "error") return '<div class="admin-state error" role="alert"><p>' + t("admin_load_error") + ": " + esc(error) + '</p><button type="button" class="admin-retry">' + t("admin_retry") + "</button></div>";
        return '<p class="admin-state">' + t("admin_no_records") + "</p>";
    }

    function resultUrl(systemId) {
        const target = new URL(window.EvaluatorRuntimeUrl.fromScript("../../../admin/results.html", scriptUrl));
        target.searchParams.set("system", systemId);
        return target.href;
    }

    function recommendation(row) {
        if (row.status === "no-data") return t("priority_rec_no_data");
        if (row.lowSample || row.preliminary) return t("priority_rec_wait");
        if (row.status === "improve") return t("priority_rec_improve");
        if (row.status === "watch") return t("priority_rec_watch");
        return t("priority_rec_good");
    }

    function renderChart(rows) {
        const chartModel = window.AdminChartModel
            ? window.AdminChartModel.computeSystemComparison(rows, window.ImprovementPriority?.CONFIG?.thresholds)
            : null;
        const chartHtml = chartModel && window.AdminCharts
            ? window.AdminCharts.renderSystemComparison(chartModel, { resultUrl: id => resultUrl(id) })
            : "";
        return '<section class="admin-panel priority-panel" aria-labelledby="priority-chart-title">' +
            '<div class="priority-panel-heading"><div>' +
            '<h2 id="priority-chart-title">' + t("priority_chart_title") + '</h2>' +
            '<p>' + t("priority_chart_subtitle") + '</p>' +
            '</div></div>' +
            chartHtml +
            '</section>';
    }

    function renderTable(rows) {
        const body = rows.map((row, index) => {
            const warning = (row.lowSample ? '<span class="priority-warning-tag">' + t("priority_low_sample") + '</span>' : "") +
                (row.preliminary ? '<span class="priority-warning-tag">' + t("priority_preliminary") + '</span>' : "");
            const sat = row.satisfactionAverage === null ? t("priority_no_data_value") : `${row.satisfactionAverage.toFixed(2)} / 5 (n=${row.satisfaction.n})`;
            const effect = row.effectivenessScore === null ? t("priority_no_data_value") : `${number(row.effectivenessScore)} / 100 (n=${row.effectiveness.n})`;
            const ratio = `${row.metricImprovement.improved}/${row.metricImprovement.total}`;
            return "<tr><td>" + (index + 1) + '</td><th scope="row">' + esc(row.name) + ' <small>' + esc(row.systemId) + '</small></th><td>' + esc(effect) + '</td><td>' + esc(sat) + '</td><td>' + ratio + '</td><td><strong class="priority-status priority-status-' + esc(row.status) + '">' + t(statusKey[row.status]) + "</strong>" + warning + '</td><td>' + esc(recommendation(row)) + "</td></tr>";
        }).join("");
        return '<section class="admin-panel priority-table-panel"><h2>' + t("priority_table_title") + '</h2><div class="admin-table-wrap priority-table-wrap"><table><caption class="sr-only">' + t("priority_table_caption") + '</caption><thead><tr><th scope="col">' + t("priority_rank") + '</th><th scope="col">' + t("admin_system_name") + '</th><th scope="col">' + t("priority_effectiveness_n") + '</th><th scope="col">' + t("priority_satisfaction_n") + '</th><th scope="col">' + t("priority_metric_improved") + '</th><th scope="col">' + t("priority_status") + '</th><th scope="col">' + t("priority_recommendation") + '</th></tr></thead><tbody>' + body + "</tbody></table></div></section>";
    }

    function render(data, statuses) {
        if (!data) {
            root.innerHTML = statePanel("loading");
            return;
        }
        const model = window.AdminOverviewModel.compute(data.systems, data.quant, data.evaluations);
        const effectiveness = new Map();
        const satisfaction = new Map();
        for (const system of model.systems) {
            const quantRows = model.quantBySystem.get(system.id) || [];
            const evalRows = model.satisfactionBySystem.get(system.id) || [];
            effectiveness.set(system.id, quantRows.length
                ? window.EffectivenessScoring.summarizeSystem(quantRows, window.EffectivenessExamples.metrics)
                : null);
            satisfaction.set(system.id, evalRows.length
                ? window.EffectivenessScoring.summarizeSatisfaction(evalRows).find(item => item.systemId === system.id) || null
                : null);
        }
        const rows = window.ImprovementPriority.rankSystems(model.systems, effectiveness, satisfaction);
        const counts = rows.reduce((all, row) => { all[row.status] += 1; return all; }, { improve: 0, watch: 0, good: 0, "no-data": 0 });
        const cards = [
            ["improve", "priority_status_improve"], ["watch", "priority_status_watch"],
            ["good", "priority_status_good"], ["no-data", "priority_status_no_data"]
        ].map(([key, label]) => '<article class="admin-kpi"><h2>' + t(label) + '</h2><p>' + counts[key] + "</p></article>").join("");
        const mockBanner = model.mockCount
            ? '<p class="admin-state notice priority-mock-banner" role="status">' + t("priority_mock_notice", { count: model.mockCount }) + "</p>"
            : "";
        const errorBanner = statuses.some(result => result.status === "rejected")
            ? '<div class="admin-state error" role="alert"><p>' + t("admin_load_error") + ": " + statuses.filter(result => result.status === "rejected").map(result => esc(result.reason?.message || "")).join("; ") + '</p><button type="button" class="admin-retry">' + t("admin_retry") + "</button></div>"
            : "";
        root.innerHTML = errorBanner + mockBanner +
            '<div class="admin-kpi-grid priority-kpi-grid">' + cards + "</div>" +
            renderChart(rows) + renderTable(rows) +
            '<p class="admin-state notice priority-statistics-note">' + t("admin_not_tested") + "</p>";
        root.querySelector(".admin-retry")?.addEventListener("click", load);
    }

    async function load() {
        render(null);
        const results = await window.AdminData.fromWindow().load();
        const systemsStatus = results.systems;
        const systems = systemsStatus.status === "fulfilled"
            ? systemsStatus.value
            : window.AssessmentCatalog?.getSystems?.() || window.systems || [];
        render({
            systems,
            quant: results.effectiveness.status === "fulfilled" ? results.effectiveness.value : [],
            evaluations: results.satisfaction.status === "fulfilled" ? results.satisfaction.value : []
        }, Object.values(results));
        if (Object.values(results).every(result => result.status === "rejected")) {
            root.innerHTML = statePanel("error", Object.values(results).map(result => result.reason.message).join("; "));
            root.querySelector(".admin-retry")?.addEventListener("click", load);
        }
    }

    document.addEventListener("langchange", load);
    load();
})();
