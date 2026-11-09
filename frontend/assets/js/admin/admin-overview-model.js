(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.AdminOverviewModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";
    function compute(systems, quantRecords, evaluations) {
        const realQuant = quantRecords.filter(record => record?.config?.isDemo !== true);
        const evaluators = new Set();
        for (const record of realQuant) {
            const id = record.userId || record.user_id || record.profile?.id;
            if (id) evaluators.add(String(id));
        }
        for (const record of evaluations) if (record.evaluatorId || record.evaluator_id) evaluators.add(String(record.evaluatorId || record.evaluator_id));
        const quantBySystem = new Map();
        for (const record of realQuant) {
            const id = record.systemId || record.system_id;
            if (!id) continue;
            if (!quantBySystem.has(id)) quantBySystem.set(id, []);
            quantBySystem.get(id).push(record);
        }
        const satisfactionBySystem = new Map();
        for (const record of evaluations) {
            if (!record.systemId) continue;
            if (!satisfactionBySystem.has(record.systemId)) satisfactionBySystem.set(record.systemId, []);
            satisfactionBySystem.get(record.systemId).push(record);
        }
        const ids = new Set([...quantBySystem.keys(), ...satisfactionBySystem.keys()]);
        const latest = [
            ...realQuant.map(record => ({ ...record, dataType: "effectiveness" })),
            ...evaluations.map(record => ({ ...record, dataType: "satisfaction" }))
        ].sort((a, b) => Date.parse(b.submittedAt || b.submitted_at || "") - Date.parse(a.submittedAt || a.submitted_at || ""));
        return {
            realQuant,
            evaluations,
            evaluators,
            systems: systems.filter(system => ids.has(system.id)),
            quantBySystem,
            satisfactionBySystem,
            latest,
            excludedDemo: quantRecords.filter(record => record?.config?.isDemo === true).length,
            latestDate: latest[0]?.submittedAt || latest[0]?.submitted_at || ""
        };
    }
    return Object.freeze({ compute });
});
