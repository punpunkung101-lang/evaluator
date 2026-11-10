(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.AdminOverviewModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";
    function isMock(record) {
        return typeof record?.id === "string" && record.id.startsWith("mock-");
    }
    function compute(systems, quantRecords, evaluations) {
        const allQuant = Array.isArray(quantRecords) ? quantRecords : [];
        const allEvaluations = Array.isArray(evaluations) ? evaluations : [];
        const realQuant = allQuant.filter(record => record?.config?.isDemo !== true);
        const mockQuant = allQuant.filter(isMock);
        const mockEvaluations = allEvaluations.filter(isMock);
        const evaluators = new Set();
        for (const record of realQuant) {
            const id = record.userId || record.user_id || record.profile?.id;
            if (id) evaluators.add(String(id));
        }
        for (const record of allEvaluations) if (record.evaluatorId || record.evaluator_id) evaluators.add(String(record.evaluatorId || record.evaluator_id));
        const quantBySystem = new Map();
        for (const record of realQuant) {
            const id = record.systemId || record.system_id;
            if (!id) continue;
            if (!quantBySystem.has(id)) quantBySystem.set(id, []);
            quantBySystem.get(id).push(record);
        }
        const satisfactionBySystem = new Map();
        for (const record of allEvaluations) {
            if (!record.systemId) continue;
            if (!satisfactionBySystem.has(record.systemId)) satisfactionBySystem.set(record.systemId, []);
            satisfactionBySystem.get(record.systemId).push(record);
        }
        const latest = [
            ...realQuant.map(record => ({ ...record, dataType: "effectiveness" })),
            ...allEvaluations.map(record => ({ ...record, dataType: "satisfaction" }))
        ].sort((a, b) => Date.parse(b.submittedAt || b.submitted_at || "") - Date.parse(a.submittedAt || a.submitted_at || ""));
        return {
            realQuant,
            evaluations: allEvaluations,
            evaluators,
            systems: [...(Array.isArray(systems) ? systems : [])].sort((a, b) =>
                Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.id).localeCompare(String(b.id))
            ),
            quantBySystem,
            satisfactionBySystem,
            latest,
            excludedDemo: allQuant.filter(record => record?.config?.isDemo === true).length,
            mockQuant,
            mockEvaluations,
            mockCount: mockQuant.length + mockEvaluations.length,
            latestDate: latest[0]?.submittedAt || latest[0]?.submitted_at || ""
        };
    }
    return Object.freeze({ compute });
});
