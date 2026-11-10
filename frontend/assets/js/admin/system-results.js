(function () {
    "use strict";
    const main = document.getElementById("system-results");
    if (!main) return;
    const t = key => window.ThemeLang?.i18n?.[document.documentElement.lang === "en" ? "en" : "th"]?.[key] || key;
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
    const fmt = value => Number.isFinite(value) ? value.toFixed(2) : "—";
    const tabIds = ["summary", "effectiveness", "satisfaction", "settings"];

    function showTab() {
        const tab = tabIds.includes(location.hash.slice(1)) ? location.hash.slice(1) : "summary";
        tabIds.forEach(id => {
            const el = document.getElementById("tab-" + id);
            if (el) el.hidden = id !== tab;
        });
        document.querySelectorAll(".admin-tabs a").forEach(a => {
            const active = a.hash === "#" + tab;
            a.classList.toggle("active", active);
            if (active) a.setAttribute("aria-current", "page");
            else a.removeAttribute("aria-current");
        });
        document.querySelector(".admin-settings-links")?.toggleAttribute("hidden", tab !== "settings");
    }

    function metricRows(result) {
        if (!result.metrics.length) return '<tr><td colspan="7">' + t("admin_no_records") + "</td></tr>";
        return result.metrics.map(metric => {
            const definition = metric.definition;
            const lang = document.documentElement.lang === "en" ? "en" : "th";
            const name = definition?.name?.[lang] || definition?.name || metric.id;
            const unit = definition?.unit?.[lang] || "";
            const before = fmt(metric.before), after = fmt(metric.after);
            const change = metric.before !== null && metric.before !== 0 ? ((metric.after - metric.before) / Math.abs(metric.before) * 100).toFixed(1) + "%" : "—";
            const direction = definition?.direction === "increase" ? (lang === "en" ? "Higher is better" : "เพิ่มขึ้นยิ่งดี") : (lang === "en" ? "Lower is better" : "ลดลงยิ่งดี");
            const max = Math.max(metric.before || 0, metric.after || 0, 1);
            const beforeWidth = Math.max(0, Math.min(100, (metric.before || 0) / max * 100));
            const afterWidth = Math.max(0, Math.min(100, (metric.after || 0) / max * 100));
            const tag = metric.outsideCriteria ? t("admin_outside_criteria") : metric.scored ? "" : t("admin_no_records");
            return '<tr><th scope="row">' + esc(name) + ' <small>' + esc(metric.id) + '</small><div class="admin-compare-bars" aria-label="' + esc(t("admin_before") + " " + before + " " + t("admin_after") + " " + after) + '"><span class="before" style="width:' + beforeWidth + '%"></span><span class="after" style="width:' + afterWidth + '%"></span></div></th><td>' + before + " " + esc(unit) + '</td><td>' + after + " " + esc(unit) + '</td><td>' + change + '</td><td>' + esc(direction) + '</td><td>' + (metric.weight == null ? "—" : metric.weight) + '</td><td>' + (metric.scored ? fmt(metric.scoreAfter) : esc(tag)) + "</td></tr>";
        }).join("");
    }

    function render(data, systemId) {
        const system = data.systems.find(item => item.id === systemId);
        document.getElementById("results-title").textContent = (system?.name || systemId || t("admin_system_all")) + (systemId ? " (" + systemId + ")" : "");
        const quant = data.quant.filter(r => (r.systemId || r.system_id) === systemId);
        const evals = data.evaluations.filter(r => (r.systemId || r.system_id) === systemId);
        const score = window.EffectivenessScoring.summarizeSystem(quant, window.EffectivenessExamples.metrics);
        const sat = window.EffectivenessScoring.summarizeSatisfaction(evals).find(item => (item.systemId || item.system_id) === systemId);
        const sentence = score.summary === "no-data" ? t("admin_no_records") : score.summary === "preliminary" ? t("admin_preliminary") : score.summary === "after-better" ? t("admin_after_better") : score.summary === "before-better" ? t("admin_before_better") : t("admin_similar");

        // Tab 1: Summary with Chart Type 1 (System Comparison for selected system)
        const summarizedSystem = window.ImprovementPriority?.summarizeSystem
            ? window.ImprovementPriority.summarizeSystem(system, score, sat)
            : {
                systemId,
                name: system?.name || systemId,
                effectivenessScore: score.afterScore,
                beforeScore: score.beforeScore,
                satisfactionAverage: sat?.average ?? null,
                satisfactionScore: sat?.score ?? (sat?.average ? (sat.average - 1) / 4 * 100 : null),
                effectiveness: score,
                satisfaction: sat,
                status: "good"
            };
        const summaryChartModel = window.AdminChartModel?.computeSystemComparison([summarizedSystem], window.ImprovementPriority?.CONFIG?.thresholds);
        const summaryChartHtml = summaryChartModel && window.AdminCharts
            ? '<section class="admin-panel"><h2>' + t("priority_chart_title") + '</h2>' +
              window.AdminCharts.renderSystemComparison(summaryChartModel, { resultUrl: id => `?system=${encodeURIComponent(id)}` }) +
              '</section>'
            : '';

        document.getElementById("tab-summary").innerHTML =
            '<p class="admin-result-summary">' + sentence + ' · ' + t("admin_score_sentence").replace("{before}", fmt(score.beforeScore)).replace("{after}", fmt(score.afterScore)) + '</p>' +
            '<div class="admin-result-grid">' +
                '<article><h3>' + t("admin_before_score") + '</h3><p>' + fmt(score.beforeScore) + '</p></article>' +
                '<article><h3>' + t("admin_after_score") + '</h3><p>' + fmt(score.afterScore) + '</p></article>' +
                '<article><h3>' + t("admin_coverage") + '</h3><p>' + score.coverage.toFixed(0) + '%</p></article>' +
                '<article><h3>' + t("admin_evaluator_n") + '</h3><p>' + score.n + '</p></article>' +
            '</div>' +
            summaryChartHtml +
            '<p class="admin-state notice">' + t("admin_not_tested") + '</p>' +
            (score.lowSample ? '<p class="admin-state notice">' + t("admin_low_n_warning") + '</p>' : "") +
            '<p class="admin-state">' + t("admin_excluded_demo") + ': ' + score.excludedDemo + '</p>' +
            (score.warnings.length ? '<p class="admin-state notice">' + t("admin_invalid_metric_warning") + ': ' + score.warnings.map(esc).join(", ") + '</p>' : "") +
            '<section class="admin-panel"><h2>' + t("admin_limitations_title") + '</h2><ul class="admin-limitations">' + ["admin_limit_aggregated", "admin_limit_small_n", "admin_limit_learning", "admin_limit_recall", "admin_limit_context"].map(k => "<li>" + t(k) + "</li>").join("") + "</ul></section>";

        // Tab 2: Effectiveness with Chart Type 2 (Paired Metrics before-after)
        const metricModel = window.AdminChartModel?.computeMetricComparison(score.metrics);
        const metricChartHtml = metricModel && window.AdminCharts
            ? '<section class="admin-panel"><h2>' + t("chart_metric_scored_title") + '</h2>' +
              window.AdminCharts.renderMetricComparison(metricModel) +
              '</section>'
            : '';

        document.getElementById("tab-effectiveness").innerHTML =
            metricChartHtml +
            '<section class="admin-panel"><h2>' + t("admin_effectiveness_table") + '</h2>' +
            '<p class="admin-state notice">' + t("admin_evaluator_n") + ': ' + score.n + ' · ' + t("admin_coverage") + ': ' + score.coverage.toFixed(0) + '%</p>' +
            '<div class="admin-table-wrap"><table><thead><tr>' +
                '<th>' + t("admin_metric") + '</th><th>' + t("admin_before") + '</th><th>' + t("admin_after") + '</th>' +
                '<th>' + t("admin_change") + '</th><th>' + t("admin_direction") + '</th><th>' + t("admin_weight") + '</th><th>' + t("admin_relative_score") + '</th>' +
            '</tr></thead><tbody>' + metricRows(score) + "</tbody></table></div></section>";

        // Tab 3: Satisfaction with Chart Type 3 (100% Stacked Bar) & Monthly Trend Bars
        let satContent = '<p class="admin-state">' + t("admin_no_records") + '</p>';
        if (sat) {
            const distModel = window.AdminChartModel?.computeSatisfactionDistribution(sat.records);
            const distHtml = distModel && window.AdminCharts
                ? window.AdminCharts.renderSatisfactionDistribution(distModel)
                : '<p class="admin-state">' + t("admin_no_records") + '</p>';

            const trendModel = window.AdminChartModel?.computeMonthlySatisfactionTrend(evals);
            const trendHtml = trendModel && window.AdminCharts
                ? window.AdminCharts.renderMonthlySatisfactionTrend(trendModel)
                : '<p class="admin-state">' + t("admin_no_records") + '</p>';

            const warningHtml = sat.lowSample ? '<p class="admin-state notice">' + t("admin_low_n_warning") + '</p>' : "";
            const kpiGridHtml = '<div class="admin-result-grid">' +
                '<article><h3>' + t("admin_satisfaction_avg") + '</h3><p>' + fmt(sat.average) + ' / 5</p></article>' +
                '<article><h3>' + t("admin_satisfaction_level") + '</h3><p>' + t("admin_level_" + sat.level.replace("-", "_")) + '</p></article>' +
                '<article><h3>' + t("admin_evaluator_n") + '</h3><p>' + sat.n + '</p></article>' +
            '</div>';

            const chartsGridHtml = '<div class="admin-chart-grid">' +
                '<section class="admin-panel"><h2>' + t("chart_sat_rating_label") + '</h2><div class="admin-chart">' + distHtml + '</div></section>' +
                '<section class="admin-panel"><h2>' + t("chart_sat_monthly_title") + '</h2><div class="admin-chart">' + trendHtml + '</div></section>' +
            '</div>';

            const tableHtml = '<section class="admin-panel"><h2>' + t("admin_recent_title") + '</h2><div class="admin-table-wrap"><table><thead><tr>' +
                '<th>' + t("admin_evaluator_n") + '</th><th>' + t("admin_satisfaction_avg") + '</th><th>' + t("admin_satisfaction_level") + '</th>' +
            '</tr></thead><tbody>' + sat.records.map(row => '<tr><td>' + esc(row.evaluatorId) + '</td><td>' + fmt(row.average) + ' / 5</td><td>' + t("admin_level_" + window.EffectivenessScoring.satisfactionLevel(row.average).replace("-", "_")) + '</td></tr>').join("") + "</tbody></table></div></section>";

            const feedbackHtml = sat.records.some(row => row.feedback)
                ? '<section class="admin-panel"><h2>' + t("admin_feedback") + '</h2><ul class="admin-limitations">' + sat.records.filter(row => row.feedback).map(row => "<li>" + esc(row.feedback) + "</li>").join("") + "</ul></section>"
                : "";

            satContent = warningHtml + kpiGridHtml + chartsGridHtml + tableHtml + feedbackHtml;
        }
        document.getElementById("tab-satisfaction").innerHTML = satContent;
        showTab();
    }

    async function load() {
        const status = document.getElementById("results-status");
        status.innerHTML = '<p class="admin-state" role="status">' + t("admin_loading") + "</p>";
        const results = await window.AdminData.fromWindow().load();
        const resultsList = [results.systems, results.effectiveness, results.satisfaction];
        const errors = resultsList.filter(result => result.status === "rejected");
        if (errors.length) {
            status.innerHTML = '<div class="admin-state error" role="alert"><p>' + t("admin_load_error") + ': ' + errors.map(result => esc(result.reason.message)).join("; ") + '</p><button id="results-retry" class="admin-retry" type="button">' + t("admin_retry") + "</button></div>";
            document.getElementById("results-retry").addEventListener("click", load);
            if (errors.length === 3) return;
        } else {
            status.textContent = "";
        }
        const systems = results.systems.status === "fulfilled" ? results.systems.value : window.AssessmentCatalog?.getSystems?.() || window.systems || [];
        const quant = results.effectiveness.status === "fulfilled" ? results.effectiveness.value : [];
        const evals = results.satisfaction.status === "fulfilled" ? results.satisfaction.value : [];
        const requested = new URLSearchParams(location.search).get("system");
        const systemId = requested || systems[0]?.id || "";
        window.AdminTabs.mount({
            activeTab: location.hash.slice(1) || "summary",
            systemId,
            systems
        });
        render({
            systems,
            quant,
            evaluations: evals
        }, systemId);
    }

    window.addEventListener("hashchange", showTab);
    document.addEventListener("langchange", load);
    load();
})();
