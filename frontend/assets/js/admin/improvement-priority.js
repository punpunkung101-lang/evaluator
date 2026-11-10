(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.ImprovementPriority = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const CONFIG = Object.freeze({
        thresholds: Object.freeze({
            improveCombined: 50,
            watchCombined: 70,
            improveSatisfaction: 2.61,
            watchSatisfaction: 3.41,
            minimumCoverage: 80,
            lowSample: 5
        }),
        statusOrder: Object.freeze({ improve: 0, watch: 1, good: 2, "no-data": 3 }),
        satisfactionScale: Object.freeze({ min: 1, max: 5, outputMin: 0, outputMax: 100 })
    });

    function finite(value) {
        return typeof value === "number" && Number.isFinite(value);
    }

    function score(value) {
        return finite(value) && value >= 0 && value <= 100 ? value : null;
    }

    function normalizeSatisfaction(value) {
        const { min, max, outputMin, outputMax } = CONFIG.satisfactionScale;
        if (!finite(value) || value < min || value > max) return null;
        return outputMin + (value - min) / (max - min) * (outputMax - outputMin);
    }

    function getBySystem(source, systemId) {
        if (source instanceof Map) return source.get(systemId) || null;
        if (Array.isArray(source)) return source.find(item => item?.systemId === systemId) || null;
        return source && typeof source === "object" ? source[systemId] || null : null;
    }

    function metricImprovement(effectiveness) {
        const metrics = Array.isArray(effectiveness?.metrics) ? effectiveness.metrics : [];
        const scored = metrics.filter(metric => metric?.scored && finite(metric.scoreBefore) && finite(metric.scoreAfter));
        return {
            improved: scored.filter(metric => metric.scoreAfter > metric.scoreBefore).length,
            total: scored.length
        };
    }

    function classify({ summary, satisfactionAverage, combined }) {
        if (combined === null) return "no-data";
        const { improveCombined, watchCombined, improveSatisfaction, watchSatisfaction } = CONFIG.thresholds;
        if (summary === "before-better" ||
            (satisfactionAverage !== null && satisfactionAverage < improveSatisfaction) ||
            combined < improveCombined) return "improve";
        if (combined < watchCombined ||
            (satisfactionAverage !== null && satisfactionAverage < watchSatisfaction)) return "watch";
        return "good";
    }

    function summarizeSystem(system, effectiveness, satisfaction) {
        const effectivenessScore = score(effectiveness?.afterScore);
        const satisfactionAverage = finite(satisfaction?.average) &&
            satisfaction.average >= 1 && satisfaction.average <= 5 ? satisfaction.average : null;
        const satisfactionScore = normalizeSatisfaction(satisfactionAverage);
        const availableScores = [effectivenessScore, satisfactionScore].filter(value => value !== null);
        const combined = availableScores.length
            ? availableScores.reduce((sum, value) => sum + value, 0) / availableScores.length
            : null;
        const thresholds = CONFIG.thresholds;
        const preliminary = Boolean(effectiveness && (
            effectiveness.summary === "preliminary" ||
            (Array.isArray(effectiveness.metrics) && effectiveness.metrics.length > 0 &&
                finite(effectiveness.coverage) && effectiveness.coverage < thresholds.minimumCoverage)
        ));
        const lowSample = Boolean(
            (effectivenessScore !== null && finite(effectiveness.n) && effectiveness.n < thresholds.lowSample) ||
            (satisfactionScore !== null && finite(satisfaction?.n) && satisfaction.n < thresholds.lowSample)
        );
        return {
            systemId: String(system?.id || effectiveness?.systemId || satisfaction?.systemId || ""),
            name: system?.name || system?.id || "",
            sortOrder: finite(system?.sort_order) ? system.sort_order : finite(system?.sortOrder) ? system.sortOrder : 0,
            effectiveness,
            satisfaction,
            effectivenessScore,
            satisfactionAverage,
            satisfactionScore,
            combined,
            status: classify({ summary: effectiveness?.summary, satisfactionAverage, combined }),
            lowSample,
            preliminary,
            metricImprovement: metricImprovement(effectiveness)
        };
    }

    function rankSystems(systems, effectivenessBySystem, satisfactionBySystem) {
        return (Array.isArray(systems) ? systems : [])
            .map(system => summarizeSystem(
                system,
                getBySystem(effectivenessBySystem, system.id),
                getBySystem(satisfactionBySystem, system.id)
            ))
            .sort((a, b) => CONFIG.statusOrder[a.status] - CONFIG.statusOrder[b.status] ||
                (a.combined ?? Infinity) - (b.combined ?? Infinity) ||
                a.sortOrder - b.sortOrder || a.systemId.localeCompare(b.systemId));
    }

    return Object.freeze({ CONFIG, normalizeSatisfaction, summarizeSystem, rankSystems });
});
