(function () {
     "use strict";
     const main = document.getElementById("system-results");
     if (!main) return;
     const t = key => window.ThemeLang?.i18n?.[document.documentElement.lang === "en" ? "en" : "th"]?.[key] || key;
     const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
         "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }
     [c]));
     const fmt = value => Number.isFinite(value) ? value.toFixed(2) : "—";
     const tabIds = ["summary", "effectiveness", "satisfaction", "settings"];
     let satisfactionCharts = [];
     function renderSatisfactionCharts(records) {
         satisfactionCharts.forEach(chart => chart.destroy());
         satisfactionCharts = [];
         if (typeof Chart === "undefined") return;
         const style = getComputedStyle(document.documentElement);
         const primary = style.getPropertyValue("--primary").trim();
         const text = style.getPropertyValue("--text-secondary").trim();
         const grid = style.getPropertyValue("--border").trim();
         const counts = [0, 0, 0, 0, 0];
         for (const record of records) for (const value of (record.satisfactionAnswers || [])) {
             if (Number.isInteger(value) && value >= 1 && value <= 5) counts[value - 1]++;
        }
         const monthly = new Map();
         for (const record of records) {
             const month = String(record.submittedAt || "").slice(0, 7);
             const values = (record.satisfactionAnswers || []).filter(value => Number.isInteger(value) && value >= 1 && value <= 5);
             if (!month || !values.length) continue;
             if (!monthly.has(month)) monthly.set(month, []);
             monthly.get(month).push(...values);
        }
         const common = {
             responsive: true, maintainAspectRatio: false, plugins: {
                 legend: {
                     labels: {
                         color: text
                    }
                }
            }
             , scales: {
                 x: {
                     ticks: {
                         color: text
                    }
                     , grid: {
                         color: grid
                    }
                }
                 , y: {
                     beginAtZero: true, ticks: {
                         color: text
                    }
                     , grid: {
                         color: grid
                    }
                }
            }
        }
         ;
         const ratings = document.getElementById("satisfaction-ratings-chart");
         const trend = document.getElementById("satisfaction-trend-chart");
         if (ratings) satisfactionCharts.push(new Chart(ratings, {
             type: "bar", data: {
                 labels: ["1", "2", "3", "4", "5"], datasets: [{
                     label: t("admin_satisfaction_avg"), data: counts, backgroundColor: primary
                }
                 ]
            }
             , options: common
        }
         ));
         if (trend) satisfactionCharts.push(new Chart(trend, {
             type: "line", data: {
                 labels: [...monthly.keys()].sort(), datasets: [{
                     label: t("admin_satisfaction_avg"), data: [...monthly.values()].map(items => items.reduce((sum, value) => sum + value, 0) / items.length), borderColor: primary, backgroundColor: "transparent"
                }
                 ]
            }
             , options: common
        }
         ));
    }
     function showTab() {
         const tab = tabIds.includes(location.hash.slice(1)) ? location.hash.slice(1) : "summary";
         tabIds.forEach(id => {
             const el = document.getElementById("tab-" + id);  if (el) el.hidden = id !== tab;
        }
         );
         document.querySelectorAll(".admin-tabs a").forEach(a => {
             const active = a.hash === "#" + tab;  a.classList.toggle("active", active);  if (active) a.setAttribute("aria-current", "page");  else a.removeAttribute("aria-current");
        }
         );
         document.querySelector(".admin-settings-links")?.toggleAttribute("hidden", tab !== "settings");
    }
     function metricRows(result) {
         if (!result.metrics.length) return '<tr><td colspan="7">' + t("admin_no_records") + "</td></tr>";
         return result.metrics.map(metric => {
             const definition = metric.definition;  const lang = document.documentElement.lang === "en" ? "en" : "th";  const name = definition?.name?.[lang] || definition?.name || metric.id;  const unit = definition?.unit?.[lang] || "";  const before = fmt(metric.before), after = fmt(metric.after);  const change = metric.before !== null && metric.before !== 0 ? ((metric.after - metric.before) / Math.abs(metric.before) * 100).toFixed(1) + "%" : "—";  const direction = definition?.direction === "increase" ? (lang === "en" ? "Higher is better" : "เพิ่มขึ้นยิ่งดี") : (lang === "en" ? "Lower is better" : "ลดลงยิ่งดี");  const max = Math.max(metric.before || 0, metric.after || 0, 1);  const beforeWidth = Math.max(0, Math.min(100, (metric.before || 0) / max * 100));  const afterWidth = Math.max(0, Math.min(100, (metric.after || 0) / max * 100));  const tag = metric.outsideCriteria ? t("admin_outside_criteria") : metric.scored ? "" : t("admin_no_records");  return '<tr><th scope="row">' + esc(name) + ' <small>' + esc(metric.id) + '</small><div class="admin-compare-bars" aria-label="' + esc(t("admin_before") + " " + before + " " + t("admin_after") + " " + after) + '"><span class="before" style="width:' + beforeWidth + '%"></span><span class="after" style="width:' + afterWidth + '%"></span></div></th><td>' + before + " " + esc(unit) + '</td><td>' + after + " " + esc(unit) + '</td><td>' + change + '</td><td>' + esc(direction) + '</td><td>' + (metric.weight == null ? "—" : metric.weight) + '</td><td>' + (metric.scored ? fmt(metric.scoreAfter) : esc(tag)) + "</td></tr>";
        }
         ).join("");
    }
     function render(data, systemId) {
         const system = data.systems.find(item => item.id === systemId);
         document.getElementById("results-title").textContent = (system?.name || systemId || t("admin_system_all")) + (systemId ? " (" + systemId + ")" : "");
         const quant = data.quant.filter(r => (r.systemId || r.system_id) === systemId);
         const evals = data.evaluations.filter(r => r.systemId === systemId);
         const score = window.EffectivenessScoring.summarizeSystem(quant, window.EffectivenessExamples.metrics);
         const sat = window.EffectivenessScoring.summarizeSatisfaction(evals).find(item => item.systemId === systemId);
         const sentence = score.summary === "no-data" ? t("admin_no_records") : score.summary === "preliminary" ? t("admin_preliminary") : score.summary === "after-better" ? t("admin_after_better") : score.summary === "before-better" ? t("admin_before_better") : t("admin_similar");
         document.getElementById("tab-summary").innerHTML = '<p class="admin-result-summary">' + sentence + ' · ' + t("admin_score_sentence").replace("{before}", fmt(score.beforeScore)).replace("{after}", fmt(score.afterScore)) + '</p>' + '<div class="admin-result-grid"><article><h3>' + t("admin_before_score") + '</h3><p>' + fmt(score.beforeScore) + '</p></article><article><h3>' + t("admin_after_score") + '</h3><p>' + fmt(score.afterScore) + '</p></article><article><h3>' + t("admin_coverage") + '</h3><p>' + score.coverage.toFixed(0) + '%</p></article><article><h3>' + t("admin_evaluator_n") + '</h3><p>' + score.n + '</p></article></div>' + '<p class="admin-state notice">' + t("admin_not_tested") + '</p>' + (score.lowSample ? '<p class="admin-state notice">' + t("admin_low_n_warning") + '</p>' : "") + '<p class="admin-state">' + t("admin_excluded_demo") + ': ' + score.excludedDemo + '</p>' + (score.warnings.length ? '<p class="admin-state notice">' + t("admin_invalid_metric_warning") + ': ' + score.warnings.map(esc).join(", ") + '</p>' : "") + '<section class="admin-panel"><h2>' + t("admin_limitations_title") + '</h2><ul class="admin-limitations">' + ["admin_limit_aggregated", "admin_limit_small_n", "admin_limit_learning", "admin_limit_recall", "admin_limit_context"].map(k => "<li>" + t(k) + "</li>").join("") + "</ul></section>";
         document.getElementById("tab-effectiveness").innerHTML = '<section class="admin-panel"><h2>' + t("admin_effectiveness_table") + '</h2><p class="admin-state notice">' + t("admin_evaluator_n") + ': ' + score.n + ' · ' + t("admin_coverage") + ': ' + score.coverage.toFixed(0) + '%</p><div class="admin-table-wrap"><table><thead><tr><th>' + t("admin_metric") + '</th><th>' + t("admin_before") + '</th><th>' + t("admin_after") + '</th><th>' + t("admin_change") + '</th><th>' + t("admin_direction") + '</th><th>' + t("admin_weight") + '</th><th>' + t("admin_relative_score") + '</th></tr></thead><tbody>' + metricRows(score) + "</tbody></table></div></section>";
         document.getElementById("tab-satisfaction").innerHTML = sat ? (sat.lowSample ? '<p class="admin-state notice">' + t("admin_low_n_warning") + '</p>' : "") + '<div class="admin-result-grid"><article><h3>' + t("admin_satisfaction_avg") + '</h3><p>' + fmt(sat.average) + ' / 5</p></article><article><h3>' + t("admin_satisfaction_level") + '</h3><p>' + t("admin_level_" + sat.level.replace("-", "_")) + '</p></article><article><h3>' + t("admin_evaluator_n") + '</h3><p>' + sat.n + '</p></article></div>' + '<div class="admin-chart-grid"><section class="admin-panel"><h2>' + t("admin_satisfaction_avg") + '</h2><div class="admin-chart"><canvas id="satisfaction-ratings-chart"></canvas></div></section><section class="admin-panel"><h2>' + t("admin_recent_title") + '</h2><div class="admin-chart"><canvas id="satisfaction-trend-chart"></canvas></div></section></div>' + '<section class="admin-panel"><h2>' + t("admin_recent_title") + '</h2><div class="admin-table-wrap"><table><thead><tr><th>' + t("admin_evaluator_n") + '</th><th>' + t("admin_satisfaction_avg") + '</th><th>' + t("admin_satisfaction_level") + '</th></tr></thead><tbody>' + sat.records.map(row => '<tr><td>' + esc(row.evaluatorId) + '</td><td>' + fmt(row.average) + ' / 5</td><td>' + t("admin_level_" + window.EffectivenessScoring.satisfactionLevel(row.average).replace("-", "_")) + '</td></tr>').join("") + "</tbody></table></div></section>" + (sat.records.some(row => row.feedback) ? '<section class="admin-panel"><h2>' + t("admin_feedback") + '</h2><ul class="admin-limitations">' + sat.records.filter(row => row.feedback).map(row => "<li>" + esc(row.feedback) + "</li>").join("") + "</ul></section>" : "") : '<p class="admin-state">' + t("admin_no_records") + "</p>";
         renderSatisfactionCharts(evals.filter(record => (record.systemId || record.system_id) === systemId));
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
        }
         else status.textContent = "";
         const systems = results.systems.status === "fulfilled" ? results.systems.value : window.AssessmentCatalog?.getSystems?.() || window.systems || [];
         const quant = results.effectiveness.status === "fulfilled" ? results.effectiveness.value : [];
         const evals = results.satisfaction.status === "fulfilled" ? results.satisfaction.value : [];
         const requested = new URLSearchParams(location.search).get("system");
         const systemId = requested || systems[0]?.id || "";
         window.AdminTabs.mount({
             activeTab: location.hash.slice(1) || "summary", systemId, systems
        }
         );
         render({
             systems, quant, evaluations: evals
        }
         , systemId);
    }
     window.addEventListener("hashchange", showTab);
     document.addEventListener("langchange", load);
     load();
}
 )();
