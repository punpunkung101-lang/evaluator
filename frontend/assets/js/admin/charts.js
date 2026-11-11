(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.AdminCharts = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const t = (key, params = {}) => {
        const lang = typeof document !== "undefined" && document.documentElement?.lang === "en" ? "en" : "th";
        const dict = typeof window !== "undefined" ? window.ThemeLang?.i18n?.[lang] : null;
        let str = dict?.[key] || key;
        for (const [k, v] of Object.entries(params)) {
            str = str.replace("{" + k + "}", v);
        }
        return str;
    };

    const esc = val => String(val ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));

    const statusTextKey = Object.freeze({
        improve: "priority_status_improve",
        watch: "priority_status_watch",
        good: "priority_status_good",
        "no-data": "priority_status_no_data"
    });

    /**
     * Render Chart Type 1: System Comparison (Grouped Horizontal Bars)
     */
    function renderSystemComparison(model, options = {}) {
        if (!model || !model.items || !model.items.length) {
            return '<p class="admin-state">' + t("no_data") + '</p>';
        }

        const thresholds = model.thresholds || (typeof window !== "undefined" && window.ImprovementPriority?.CONFIG?.thresholds) || {
            improveCombined: 50,
            watchCombined: 70,
            improveSatisfaction: 2.61,
            watchSatisfaction: 3.41,
            minimumCoverage: 80,
            lowSample: 5
        };

        const resultUrlBuilder = options.resultUrl || (sysId => `results.html?system=${encodeURIComponent(sysId)}`);

        // Axis header with ticks 0, 25, 50, 75, 100
        const ticksHtml = model.ticks.map(tick => `<span style="left:${tick}%">${tick}</span>`).join("");
        const gridHeader = `<div class="chart-axis-header" aria-hidden="true">
            <span class="chart-axis-title">${t("chart_scale_label")}</span>
            <div class="chart-ticks">${ticksHtml}</div>
        </div>`;

        // Render each system row
        const rowsHtml = model.items.map(item => {
            const before = item.before || {
                hasData: item.effectiveness?.beforeScore !== null && item.effectiveness?.beforeScore !== undefined,
                score: item.effectiveness?.beforeScore,
                width: item.effectiveness?.beforeScore ?? 0,
                label: item.effectiveness?.beforeScore !== null && item.effectiveness?.beforeScore !== undefined
                    ? `${item.effectiveness.beforeScore.toFixed(1)} / 100`
                    : null
            };
            const after = item.after || {
                hasData: item.effectiveness?.hasData,
                score: item.effectiveness?.afterScore,
                width: item.effectiveness?.afterWidth ?? 0,
                label: item.effectiveness?.label
            };
            const sat = item.satisfaction;

            const beforeText = before.hasData ? before.label : t("priority_no_data_value");
            const afterText = after.hasData ? after.label : t("priority_no_data_value");
            const satText = sat.hasData ? sat.label : t("priority_no_data_value");
            const statusLabel = t(statusTextKey[item.status] || "priority_status_no_data");

            const warnings = [];
            if (item.lowSample) warnings.push(`<span class="priority-warning-tag">${t("priority_low_sample")}</span>`);
            if (item.preliminary) warnings.push(`<span class="priority-warning-tag">${t("priority_preliminary")}</span>`);

            // Screen reader summary
            const srText = `${item.name} (${item.systemId}): ${t("chart_bar_before")} ${beforeText}, ${t("chart_bar_after")} ${afterText}, ${t("chart_bar_satisfaction")} ${satText}. ${t("priority_status")}: ${statusLabel}.`;

            // Bar 1: Before (hatched --chart-before)
            let beforeBarHtml = '';
            if (before.hasData) {
                beforeBarHtml = `<div class="chart-bar-wrap">
                    <div class="chart-track" aria-hidden="true">
                        <div class="chart-fill before-hatched" style="width:${before.width}%"></div>
                    </div>
                    <span class="chart-value">${esc(beforeText)}</span>
                </div>`;
            } else {
                beforeBarHtml = `<div class="chart-bar-wrap no-data">
                    <div class="chart-track empty" aria-hidden="true"></div>
                    <span class="chart-value empty">${esc(beforeText)}</span>
                </div>`;
            }

            // Bar 2: After (solid --chart-effectiveness)
            let afterBarHtml = '';
            if (after.hasData) {
                afterBarHtml = `<div class="chart-bar-wrap">
                    <div class="chart-track" aria-hidden="true">
                        <div class="chart-fill effectiveness" style="width:${after.width}%"></div>
                    </div>
                    <span class="chart-value">${esc(afterText)}</span>
                </div>`;
            } else {
                afterBarHtml = `<div class="chart-bar-wrap no-data">
                    <div class="chart-track empty" aria-hidden="true"></div>
                    <span class="chart-value empty">${esc(afterText)}</span>
                </div>`;
            }

            // Bar 3: Satisfaction (solid --chart-satisfaction)
            let satBarHtml = '';
            if (sat.hasData) {
                satBarHtml = `<div class="chart-bar-wrap">
                    <div class="chart-track" aria-hidden="true">
                        <div class="chart-fill satisfaction" style="width:${sat.width}%"></div>
                    </div>
                    <span class="chart-value">${esc(satText)}</span>
                </div>`;
            } else {
                satBarHtml = `<div class="chart-bar-wrap no-data">
                    <div class="chart-track empty" aria-hidden="true"></div>
                    <span class="chart-value empty">${esc(satText)}</span>
                </div>`;
            }

            const href = resultUrlBuilder(item.systemId);
            return `<div class="chart-grouped-row" role="listitem">
                <div class="chart-row-header">
                    <a class="chart-system-link" href="${esc(href)}" aria-label="${esc(srText)}">
                        <strong class="chart-system-name">${esc(item.name)}</strong>
                        <small class="chart-system-id">${esc(item.systemId)}</small>
                    </a>
                    <div class="chart-row-badges">
                        <strong class="priority-status priority-status-${esc(item.status)}">${statusLabel}</strong>
                        ${warnings.join("")}
                    </div>
                </div>
                <div class="chart-bars-area" aria-hidden="true">
                    <div class="chart-grid-background">
                        ${model.ticks.map(t => `<div class="chart-grid-line" style="left:${t}%"></div>`).join("")}
                    </div>
                    <div class="chart-row-bar">
                        <span class="chart-bar-type">${t("chart_bar_before")}</span>
                        ${beforeBarHtml}
                    </div>
                    <div class="chart-row-bar">
                        <span class="chart-bar-type">${t("chart_bar_after")}</span>
                        ${afterBarHtml}
                    </div>
                    <div class="chart-row-bar">
                        <span class="chart-bar-type">${t("chart_bar_satisfaction")}</span>
                        ${satBarHtml}
                    </div>
                </div>
            </div>`;
        }).join("");

        // Legend with 3 swatches
        const legendHtml = `<div class="chart-legend" aria-label="${t("priority_legend_aria")}">
            <span class="chart-legend-item">
                <i class="chart-legend-swatch before-hatched" aria-hidden="true"></i>
                <span>${t("chart_bar_before")}</span>
            </span>
            <span class="chart-legend-item">
                <i class="chart-legend-swatch effectiveness" aria-hidden="true"></i>
                <span>${t("chart_bar_after")}</span>
            </span>
            <span class="chart-legend-item">
                <i class="chart-legend-swatch satisfaction" aria-hidden="true"></i>
                <span>${t("chart_bar_satisfaction")}</span>
            </span>
            <span class="chart-legend-note">${t("chart_effectiveness_note")}</span>
        </div>`;

        // Footnote with thresholds
        const footnoteText = t("chart_criteria_footnote", {
            improveCombined: thresholds.improveCombined,
            watchCombined: thresholds.watchCombined,
            improveSatisfaction: thresholds.improveSatisfaction,
            watchSatisfaction: thresholds.watchSatisfaction,
            minCoverage: thresholds.minimumCoverage,
            lowSample: thresholds.lowSample
        });

        return `<div class="admin-chart-comp chart-comparison-container" role="img" aria-label="${t("priority_chart_aria")}">
            ${legendHtml}
            ${gridHeader}
            <div class="chart-grouped-list" role="list">
                ${rowsHtml}
            </div>
            <p class="chart-criteria-footnote">${esc(footnoteText)}</p>
        </div>`;
    }

    /**
     * Render Chart Type 2: Paired Before-After Bars for Individual Metrics
     */
    function renderMetricComparison(model, options = {}) {
        if (!model) return '<p class="admin-state">' + t("no_data") + '</p>';

        const scoredHtml = (model.scored || []).map(metric => {
            const dirLabel = metric.direction === "increase"
                ? (typeof document !== "undefined" && document.documentElement?.lang === "en" ? "Higher is better" : "เพิ่มขึ้นยิ่งดี")
                : (typeof document !== "undefined" && document.documentElement?.lang === "en" ? "Lower is better" : "ลดลงยิ่งดี");

            const srLabel = `${metric.name} (${metric.id}): ${t("admin_before")} ${metric.beforeRaw} ${metric.unit}, ${t("admin_after")} ${metric.afterRaw} ${metric.unit}. ${t("chart_metric_change")}: ${metric.changePercent}`;

            return `<div class="chart-metric-row" role="listitem" aria-label="${esc(srLabel)}">
                <div class="chart-metric-meta">
                    <strong class="chart-metric-name">${esc(metric.name)} <small>${esc(metric.id)}</small></strong>
                    <div class="chart-metric-tags">
                        <span class="chart-metric-dir">${esc(dirLabel)}</span>
                        <span class="chart-metric-weight">${t("admin_weight")}: ${metric.weight}%</span>
                        <span class="chart-metric-delta">${t("chart_metric_change")}: ${esc(metric.changePercent)}</span>
                    </div>
                </div>
                <div class="chart-metric-bars" aria-hidden="true">
                    <div class="chart-grid-background">
                        ${model.ticks.map(t => `<div class="chart-grid-line" style="left:${t}%"></div>`).join("")}
                    </div>
                    <div class="chart-row-bar">
                        <span class="chart-bar-type">${t("admin_before")}</span>
                        <div class="chart-bar-wrap">
                            <div class="chart-track">
                                <div class="chart-fill before-hatched" style="width:${metric.beforeWidth}%"></div>
                            </div>
                            <span class="chart-value">${esc(metric.beforeRaw)} ${esc(metric.unit)}</span>
                        </div>
                    </div>
                    <div class="chart-row-bar">
                        <span class="chart-bar-type">${t("admin_after")}</span>
                        <div class="chart-bar-wrap">
                            <div class="chart-track">
                                <div class="chart-fill effectiveness" style="width:${metric.afterWidth}%"></div>
                            </div>
                            <span class="chart-value">${esc(metric.afterRaw)} ${esc(metric.unit)}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join("");

        let outsideHtml = '';
        if (model.outsideCriteria && model.outsideCriteria.length > 0) {
            outsideHtml = `<div class="chart-outside-section">
                <h3>${t("chart_metric_outside_title")}</h3>
                <ul class="chart-outside-list">
                    ${model.outsideCriteria.map(m => `<li>
                        <strong>${esc(m.name)} <small>${esc(m.id)}</small></strong>:
                        ${t("admin_before")} ${m.before !== null ? m.before : "—"} ${esc(m.unit)},
                        ${t("admin_after")} ${m.after !== null ? m.after : "—"} ${esc(m.unit)}
                        <span class="priority-warning-tag">${t("admin_outside_criteria")}</span>
                    </li>`).join("")}
                </ul>
            </div>`;
        }

        const legendHtml = `<div class="chart-legend" aria-label="${t("priority_legend_aria")}">
            <span class="chart-legend-item">
                <i class="chart-legend-swatch before-hatched" aria-hidden="true"></i>
                <span>${t("admin_before")} (${t("chart_before_mark")})</span>
            </span>
            <span class="chart-legend-item">
                <i class="chart-legend-swatch effectiveness" aria-hidden="true"></i>
                <span>${t("admin_after")} (${t("priority_effectiveness")})</span>
            </span>
        </div>`;

        return `<div class="admin-chart-comp chart-metric-container" role="img" aria-label="${t("chart_metric_scored_title")}">
            ${legendHtml}
            <div class="chart-metric-list" role="list">
                ${scoredHtml}
            </div>
            ${outsideHtml}
        </div>`;
    }

    /**
     * Render Chart Type 3: 100% Stacked Bar for Satisfaction 5 Levels
     */
    function renderSatisfactionDistribution(model, options = {}) {
        if (!model || !model.hasData) {
            return '<p class="admin-state">' + t("no_data") + '</p>';
        }

        const levelNames = {
            1: t("admin_level_very_low"),
            2: t("admin_level_low"),
            3: t("admin_level_moderate"),
            4: t("admin_level_high"),
            5: t("admin_level_very_high")
        };

        const segmentsHtml = model.levels.map(l => {
            if (l.count === 0) return '';
            const label = `${levelNames[l.level]} (${l.range}): ${t("chart_evaluators_count", { count: l.count, percent: l.percent.toFixed(1) })}`;
            return `<div class="chart-stack-segment level-${l.level}" style="width:${l.percent}%" title="${esc(label)}" aria-label="${esc(label)}">
                ${l.percent >= 8 ? `<span class="chart-stack-label">${l.percent.toFixed(0)}%</span>` : ''}
            </div>`;
        }).join("");

        const legendHtml = model.levels.map(l => {
            return `<div class="chart-stack-legend-item">
                <i class="chart-legend-swatch level-${l.level}" aria-hidden="true"></i>
                <div class="chart-stack-legend-info">
                    <strong>${levelNames[l.level]} <small>(${l.range})</small></strong>
                    <span>${t("chart_evaluators_count", { count: l.count, percent: l.percent.toFixed(1) })}</span>
                </div>
            </div>`;
        }).join("");

        return `<div class="admin-chart-comp chart-stack-container" role="img" aria-label="${t("chart_sat_rating_label")}">
            <div class="chart-stack-bar" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">
                ${segmentsHtml}
            </div>
            <div class="chart-stack-legend">
                ${legendHtml}
            </div>
        </div>`;
    }

    /**
     * Render Monthly Satisfaction Trend (Accessible Vertical Column Bars)
     */
    function renderMonthlySatisfactionTrend(model, options = {}) {
        if (!model || !model.hasData) {
            return '<p class="admin-state">' + t("no_data") + '</p>';
        }

        const barsHtml = model.items.map(item => {
            const srText = `${item.month}: ${item.label} (${t("chart_month_evaluators", { count: item.count })})`;
            return `<div class="chart-col-item" tabindex="0" aria-label="${esc(srText)}">
                <span class="chart-col-value">${item.average.toFixed(2)}</span>
                <div class="chart-col-track" aria-hidden="true">
                    <div class="chart-col-fill satisfaction" style="height:${item.height}%"></div>
                </div>
                <span class="chart-col-month">${esc(item.month)}</span>
            </div>`;
        }).join("");

        return `<div class="admin-chart-comp chart-vertical-container" role="img" aria-label="${t("chart_sat_monthly_title")}">
            <div class="chart-vertical-bars">
                ${barsHtml}
            </div>
        </div>`;
    }

    return Object.freeze({
        renderSystemComparison,
        renderMetricComparison,
        renderSatisfactionDistribution,
        renderMonthlySatisfactionTrend
    });
});
