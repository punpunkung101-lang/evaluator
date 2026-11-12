(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.AdminOverviewModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    function isMock(row) { return row?.isMock === true || String(row?.id || "").startsWith("mock-"); }
    function compute(systems, evaluations, questions, scoring, config) {
        const rows = Array.isArray(evaluations) ? evaluations : [];
        const catalog = Array.isArray(systems) ? systems : [];
        const bank = (Array.isArray(questions) ? questions : []).map(question => ({
            ...question,
            assessmentType: question.assessmentType || question.assessment_type,
            assessment_type: question.assessment_type || question.assessmentType,
            systemId: question.systemId ?? question.system_id ?? null,
            system_id: question.system_id ?? question.systemId ?? null
        }));
        const signals = scoring.buildImprovementSignals(rows, bank, catalog, config);
        const byId = new Map(signals.map(signal => [signal.systemId, signal]));
        const detail = catalog.map(system => {
            const systemRows = rows.filter(row => row.systemId === system.id);
            const effectRows = systemRows.filter(row => row.assessmentType === "effectiveness");
            const satisfactionRows = systemRows.filter(row => row.assessmentType === "satisfaction");
            const effectQuestions = bank.filter(question => question.assessmentType === "effectiveness" && (question.systemId === system.id || question.indicator_group === "core"));
            const satisfactionQuestions = bank.filter(question => question.assessmentType === "satisfaction" && (question.systemId === system.id || question.indicator_group === "core"));
            const effectiveness = scoring.summarizeEffectiveness(effectRows, effectQuestions);
            const satisfaction = scoring.summarizeSatisfactionAssessment(satisfactionRows, satisfactionQuestions).find(item => item.systemId === system.id) || null;
            const categoryAverages = Object.values(effectiveness.categoryStats).map(item => item.average).filter(Number.isFinite);
            const effectivenessAverage = categoryAverages.length ? categoryAverages.reduce((sum, value) => sum + value, 0) / categoryAverages.length : null;
            return { system, effectiveness, satisfaction, effectivenessAverage, signal: byId.get(system.id), mockCount: systemRows.filter(isMock).length };
        });
        return {
            systems: detail,
            mockCount: rows.filter(isMock).length,
            counts: detail.reduce((counts, item) => { counts[item.signal?.level || "insufficient"] += 1; return counts; }, { urgent: 0, review: 0, strength: 0, insufficient: 0 })
        };
    }
    return Object.freeze({ compute });
});
