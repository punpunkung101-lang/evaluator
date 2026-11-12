(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.AdminData = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const types = ["effectiveness", "satisfaction"];
    function createClient({ baseUrl, token, fetchImpl = fetch }) {
        async function get(path) {
            const response = await fetchImpl(`${baseUrl}${path}`, { method: "GET", headers: token ? { Authorization: `Bearer ${token}` } : {} });
            if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
            const data = await response.json();
            if (!Array.isArray(data)) throw new Error(`Unexpected response for ${path}`);
            return data;
        }
        return Object.freeze({
            async load() {
                const [systems, evaluations, scoringSettings] = await Promise.all([get("/systems"), get("/evaluations"), fetchImpl(`${baseUrl}/settings/improvement`, { method: "GET", headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(async response => { if (!response.ok) throw new Error(`HTTP ${response.status} for /settings/improvement`); return response.json(); })]);
                const questionGroups = await Promise.all(systems.flatMap(system => types.map(type => {
                    const query = new URLSearchParams({ system_id: system.id, assessment_type: type });
                    return get(`/questions?${query}`);
                })));
                const uniqueQuestions = new Map();
                for (const question of questionGroups.flat()) {
                    const key = `${question.assessmentType || question.assessment_type}|${question.systemId ?? question.system_id ?? "core"}|${question.id}`;
                    if (!uniqueQuestions.has(key)) uniqueQuestions.set(key, question);
                }
                const questions = [...uniqueQuestions.values()].map(question => ({
                    ...question,
                    assessmentType: question.assessmentType || question.assessment_type,
                    assessment_type: question.assessment_type || question.assessmentType,
                    systemId: question.systemId ?? question.system_id,
                    system_id: question.system_id ?? question.systemId
                }));
                return {
                    systems,
                    evaluations,
                    questions,
                    scoringConfig: scoringSettings.improvement || null,
                    effectiveness: evaluations.filter(row => row.assessmentType === "effectiveness"),
                    satisfaction: evaluations.filter(row => row.assessmentType === "satisfaction")
                };
            }
        });
    }

    function fromWindow(scope = typeof window !== "undefined" ? window : {}) {
        const baseUrl = scope.API_CONFIG?.backendBaseUrl || scope.ENV?.API_BASE_URL || "http://127.0.0.1:8080";
        const token = scope.sessionStorage?.getItem("evaluatorToken") || "";
        return createClient({ baseUrl, token, fetchImpl: scope.fetch?.bind(scope) || fetch });
    }

    return Object.freeze({ createClient, fromWindow });
});
