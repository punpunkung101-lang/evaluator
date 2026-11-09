(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.EffectivenessScoring = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const THRESHOLDS = Object.freeze({ difference: 5, minimumCoverage: 80, lowSample: 5 });

    function timestamp(record) {
        const value = Date.parse(record?.submittedAt || record?.submitted_at || "");
        return Number.isFinite(value) ? value : 0;
    }

    function evaluatorId(record) {
        return String(record?.userId || record?.user_id || record?.profile?.id || "");
    }

    function latestPerEvaluator(records, userId = evaluatorId) {
        const latest = new Map();
        for (const record of Array.isArray(records) ? records : []) {
            if (!record || record.config?.isDemo === true) continue;
            const systemId = String(record.systemId || record.system_id || "");
            const evaluatorId = String(userId(record) || "");
            if (!systemId || !evaluatorId) continue;
            const key = `${systemId}\u0000${evaluatorId}`;
            const current = latest.get(key);
            if (!current || timestamp(record) >= timestamp(current)) latest.set(key, record);
        }
        return [...latest.values()];
    }

    function sideScore(before, after, direction) {
        if (before === 0 && after === 0) return { before: 100, after: 100 };
        if (direction === "decrease") {
            const minimum = Math.min(before, after);
            return {
                before: before === 0 ? 100 : minimum / before * 100,
                after: after === 0 ? 100 : minimum / after * 100
            };
        }
        const maximum = Math.max(before, after);
        return { before: before / maximum * 100, after: after / maximum * 100 };
    }

    function displayValue(value, unit) {
        if (unit === "1–5" || unit === "1-5") return (value - 1) / 4 * 100;
        return value;
    }

    function summarizeSystem(records, examples) {
        const exampleList = Array.isArray(examples) ? examples : [];
        const exampleById = new Map(exampleList.map(metric => [metric.id, metric]));
        const latest = latestPerEvaluator(records);
        const byMetric = new Map();
        const warnings = [];

        for (const record of latest) {
            const configured = Array.isArray(record.config?.metrics) ? record.config.metrics : [];
            for (const metric of configured) {
                const id = String(metric?.id || "");
                if (!id || metric.active === false) continue;
                if (!byMetric.has(id)) byMetric.set(id, { before: [], after: [], invalid: false, outside: !exampleById.has(id) });
                const group = byMetric.get(id);
                const value = record.values?.[id];
                if (!value || value.status !== "known") continue;
                const before = value.before;
                const after = value.after;
                if (typeof before !== "number" || typeof after !== "number" || !Number.isFinite(before) || !Number.isFinite(after) || before < 0 || after < 0) {
                    group.invalid = true;
                    continue;
                }
                const definition = exampleById.get(id);
                group.before.push(before);
                group.after.push(after);
            }
        }

        const metrics = [];
        let beforeTotal = 0;
        let afterTotal = 0;
        let scoredWeight = 0;
        for (const [id, group] of byMetric) {
            const definition = exampleById.get(id);
            if (group.invalid) warnings.push(id);
            const complete = group.before.length > 0 && group.after.length > 0;
            const before = complete ? group.before.reduce((sum, value) => sum + value, 0) / group.before.length : null;
            const after = complete ? group.after.reduce((sum, value) => sum + value, 0) / group.after.length : null;
            const scored = Boolean(definition && complete && Number.isFinite(Number(definition.weight)) && Number(definition.weight) > 0);
            const scoreBefore = scored ? displayValue(before, definition.unit?.th || definition.unit) : null;
            const scoreAfter = scored ? displayValue(after, definition.unit?.th || definition.unit) : null;
            const scores = scored ? sideScore(scoreBefore, scoreAfter, definition.direction) : null;
            if (scored) {
                scoredWeight += Number(definition.weight);
                beforeTotal += Number(definition.weight) * scores.before;
                afterTotal += Number(definition.weight) * scores.after;
            }
            metrics.push({ id, definition: definition || null, before, after, count: group.before.length, weight: scored ? Number(definition.weight) : null, scoreBefore: scores?.before ?? null, scoreAfter: scores?.after ?? null, scored, outsideCriteria: !definition });
        }

        const coverage = scoredWeight;
        const beforeScore = scoredWeight ? beforeTotal / scoredWeight : null;
        const afterScore = scoredWeight ? afterTotal / scoredWeight : null;
        let summary = "no-data";
        if (!latest.length || metrics.length === 0) summary = "no-data";
        else if (coverage < THRESHOLDS.minimumCoverage) summary = "preliminary";
        else if (afterScore - beforeScore >= THRESHOLDS.difference) summary = "after-better";
        else if (beforeScore - afterScore >= THRESHOLDS.difference) summary = "before-better";
        else summary = "similar";

        return {
            n: new Set(latest.map(record => evaluatorId(record))).size,
            lowSample: new Set(latest.map(record => evaluatorId(record))).size < THRESHOLDS.lowSample,
            records: latest.length,
            beforeScore,
            afterScore,
            coverage,
            summary,
            metrics,
            excludedDemo: (Array.isArray(records) ? records : []).filter(record => record?.config?.isDemo === true).length,
            warnings
        };
    }

    function satisfactionLevel(value) {
        if (!Number.isFinite(value) || value < 1 || value > 5) return null;
        if (value >= 4.21) return "very-high";
        if (value >= 3.41) return "high";
        if (value >= 2.61) return "moderate";
        if (value >= 1.81) return "low";
        return "very-low";
    }

    function summarizeSatisfaction(records) {
        const latest = latestPerEvaluator(records, record => record?.evaluatorId || record?.evaluator_id || record?.userId || record?.user_id);
        const groups = new Map();
        for (const record of latest) {
            const values = (Array.isArray(record.satisfactionAnswers) ? record.satisfactionAnswers : [])
                .filter(value => Number.isFinite(value) && value >= 1 && value <= 5);
            const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
            const systemId = String(record.systemId || record.system_id || "");
            if (!systemId) continue;
            if (!groups.has(systemId)) groups.set(systemId, []);
            if (average !== null) groups.get(systemId).push({ evaluatorId: record.evaluatorId || record.evaluator_id || record.userId || record.user_id, average, feedback: record.feedback || "", submittedAt: record.submittedAt || record.submitted_at || "" });
        }
        return [...groups].map(([systemId, items]) => ({
            systemId,
            n: items.length,
            average: items.length ? items.reduce((sum, item) => sum + item.average, 0) / items.length : null,
            level: items.length ? satisfactionLevel(items.reduce((sum, item) => sum + item.average, 0) / items.length) : null,
            lowSample: items.length < THRESHOLDS.lowSample,
            records: items
        }));
    }

    return Object.freeze({ THRESHOLDS, latestPerEvaluator, sideScore, summarizeSystem, satisfactionLevel, summarizeSatisfaction });
});
