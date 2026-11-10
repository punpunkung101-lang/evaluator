(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.AdminChartModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const TICKS = Object.freeze([0, 25, 50, 75, 100]);

    function clamp(val, min = 0, max = 100) {
        if (typeof val !== "number" || !Number.isFinite(val)) return null;
        const clamped = Math.max(min, Math.min(max, val));
        return Math.round(clamped * 1000) / 1000;
    }

    function formatNumber(val, decimals = 1) {
        return typeof val === "number" && Number.isFinite(val) ? val.toFixed(decimals) : "—";
    }

    /**
     * Compute model for Chart Type 1: System Comparison (Grouped horizontal bars)
     */
    function computeSystemComparison(rows, thresholds) {
        const items = (Array.isArray(rows) ? rows : []).map(row => {
            const hasEff = row.effectivenessScore !== null && Number.isFinite(row.effectivenessScore);
            const effAfter = hasEff ? clamp(row.afterScore ?? row.effectivenessScore) : null;
            const rawBefore = row.beforeScore !== undefined ? row.beforeScore : row.effectiveness?.beforeScore;
            const effBefore = hasEff && rawBefore !== null && rawBefore !== undefined && Number.isFinite(rawBefore)
                ? clamp(rawBefore)
                : null;

            const hasSat = row.satisfactionAverage !== null && Number.isFinite(row.satisfactionAverage);
            // Convert 1-5 scale to 0-100%: (avg - 1) / 4 * 100
            const satScore = hasSat ? clamp((row.satisfactionAverage - 1) / 4 * 100) : null;

            return {
                systemId: row.systemId,
                name: row.name || row.systemId,
                status: row.status || "no-data",
                lowSample: Boolean(row.lowSample),
                preliminary: Boolean(row.preliminary),
                combined: row.combined,
                effectiveness: {
                    hasData: hasEff,
                    afterScore: effAfter,
                    beforeScore: effBefore,
                    summary: row.effectiveness?.summary || "no-data",
                    afterWidth: effAfter !== null ? effAfter : 0,
                    beforeMark: effBefore !== null ? effBefore : null,
                    label: hasEff ? `${formatNumber(effAfter)} / 100` : null
                },
                satisfaction: {
                    hasData: hasSat,
                    average: hasSat ? row.satisfactionAverage : null,
                    score: satScore,
                    width: satScore !== null ? satScore : 0,
                    label: hasSat ? `${formatNumber(row.satisfactionAverage, 2)} / 5` : null
                }
            };
        });

        return {
            ticks: TICKS,
            items,
            thresholds: thresholds || null
        };
    }

    /**
     * Compute model for Chart Type 2: Paired before-after bars for individual metrics
     */
    function computeMetricComparison(metrics) {
        const scored = [];
        const outsideCriteria = [];

        for (const metric of (Array.isArray(metrics) ? metrics : [])) {
            const def = metric.definition;
            const lang = typeof document !== "undefined" && document.documentElement?.lang === "en" ? "en" : "th";
            const name = def?.name?.[lang] || def?.name || metric.id;
            const unit = def?.unit?.[lang] || def?.unit || "";

            if (!metric.scored || metric.outsideCriteria || !def) {
                outsideCriteria.push({
                    id: metric.id,
                    name,
                    unit,
                    before: metric.before,
                    after: metric.after,
                    outsideCriteria: true
                });
                continue;
            }

            const beforeWidth = clamp(metric.scoreBefore);
            const afterWidth = clamp(metric.scoreAfter);
            const beforeRaw = metric.before !== null ? formatNumber(metric.before, 2) : "—";
            const afterRaw = metric.after !== null ? formatNumber(metric.after, 2) : "—";

            scored.push({
                id: metric.id,
                name,
                unit,
                weight: metric.weight,
                direction: def.direction,
                scoreBefore: metric.scoreBefore,
                scoreAfter: metric.scoreAfter,
                beforeWidth: beforeWidth ?? 0,
                afterWidth: afterWidth ?? 0,
                beforeRaw,
                afterRaw,
                changePercent: metric.before !== null && metric.before !== 0
                    ? ((metric.after - metric.before) / Math.abs(metric.before) * 100).toFixed(1) + "%"
                    : "—"
            });
        }

        return {
            ticks: TICKS,
            scored,
            outsideCriteria
        };
    }

    /**
     * Compute model for Chart Type 3: 100% stacked bar of satisfaction 5 levels
     * Levels:
     * 1: 1.00 - 1.80 (very-low)
     * 2: 1.81 - 2.60 (low)
     * 3: 2.61 - 3.40 (moderate)
     * 4: 3.41 - 4.20 (high)
     * 5: 4.21 - 5.00 (very-high)
     */
    function computeSatisfactionDistribution(records) {
        const validRecords = (Array.isArray(records) ? records : []).filter(r => {
            const avg = r.average ?? r.satisfactionAverage;
            return typeof avg === "number" && Number.isFinite(avg) && avg >= 1 && avg <= 5;
        });

        const total = validRecords.length;
        const counts = [0, 0, 0, 0, 0]; // levels 1 to 5

        for (const r of validRecords) {
            const avg = r.average ?? r.satisfactionAverage;
            if (avg >= 4.21) counts[4]++;
            else if (avg >= 3.41) counts[3]++;
            else if (avg >= 2.61) counts[2]++;
            else if (avg >= 1.81) counts[1]++;
            else counts[0]++;
        }

        const levels = [
            { level: 1, key: "very_low", range: "1.00–1.80", count: counts[0], percent: total ? (counts[0] / total) * 100 : 0 },
            { level: 2, key: "low", range: "1.81–2.60", count: counts[1], percent: total ? (counts[1] / total) * 100 : 0 },
            { level: 3, key: "moderate", range: "2.61–3.40", count: counts[2], percent: total ? (counts[2] / total) * 100 : 0 },
            { level: 4, key: "high", range: "3.41–4.20", count: counts[3], percent: total ? (counts[3] / total) * 100 : 0 },
            { level: 5, key: "very_high", range: "4.21–5.00", count: counts[4], percent: total ? (counts[4] / total) * 100 : 0 }
        ];

        return {
            total,
            levels,
            hasData: total > 0
        };
    }

    /**
     * Compute monthly satisfaction trend model
     */
    function computeMonthlySatisfactionTrend(records) {
        const monthly = new Map();
        for (const record of (Array.isArray(records) ? records : [])) {
            const dateStr = record.submittedAt || record.submitted_at || "";
            const month = String(dateStr).slice(0, 7);
            const values = (Array.isArray(record.satisfactionAnswers) ? record.satisfactionAnswers : [])
                .filter(v => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5);

            if (!month || month.length < 7 || !values.length) continue;
            if (!monthly.has(month)) monthly.set(month, []);
            monthly.get(month).push(...values);
        }

        const sortedMonths = [...monthly.keys()].sort();
        const items = sortedMonths.map(month => {
            const answers = monthly.get(month);
            const avg = answers.length ? answers.reduce((a, b) => a + b, 0) / answers.length : null;
            // 1-5 scale converted to 0-100% height: (avg - 1) / 4 * 100
            const height = avg !== null ? clamp((avg - 1) / 4 * 100) : 0;
            return {
                month,
                count: answers.length,
                average: avg,
                height,
                label: avg !== null ? `${formatNumber(avg, 2)} / 5` : "—"
            };
        });

        return {
            items,
            hasData: items.length > 0
        };
    }

    return Object.freeze({
        TICKS,
        clamp,
        computeSystemComparison,
        computeMetricComparison,
        computeSatisfactionDistribution,
        computeMonthlySatisfactionTrend
    });
});
