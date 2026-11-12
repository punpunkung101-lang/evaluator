/** Shared API for the evaluator C++/SQLite backend. */
const API_CONFIG = {
    backendBaseUrl: (typeof window !== "undefined" && (window.EvaluatorAPIBaseUrl || window.ENV?.API_BASE_URL)) || "http://127.0.0.1:8080"
};
if (typeof window !== "undefined") {
    window.API_CONFIG = API_CONFIG;
    window.EvaluatorAPIBaseUrl = API_CONFIG.backendBaseUrl;
}

const EvaluationAPI = {
    async request(path, options = {}) {
        const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("evaluatorToken") : null;
        options.headers = { ...(options.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
        let response;
        try {
            response = await fetch(`${API_CONFIG.backendBaseUrl}${path}`, options);
        } catch (error) {
            throw new Error(`ไม่สามารถเชื่อมต่อ C++ Backend (${API_CONFIG.backendBaseUrl}): ${error.message}`);
        }
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(body.error || `Backend ตอบกลับ HTTP ${response.status}`);
            error.status = response.status;
            throw error;
        }
        return body;
    },

    async getQuestions(systemId, assessmentType) {
        const query = new URLSearchParams({ system_id: systemId, assessment_type: assessmentType });
        const rows = await this.request(`/questions?${query}`);
        return Array.isArray(rows) ? rows : [];
    },

    async getAdminQuestions(systemId, assessmentType) {
        const query = new URLSearchParams({ system_id: systemId, assessment_type: assessmentType, include_inactive: "1" });
        const rows = await this.request(`/questions?${query}`);
        return Array.isArray(rows) ? rows : [];
    },

    async replaceQuestions(systemId, assessmentType, questions) {
        return this.request("/questions/replace", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ systemId, assessmentType, questions })
        });
    },

    async replaceCoreQuestions(assessmentType, questions) {
        return this.request("/questions/replace-core", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assessmentType, questions })
        });
    },

    async getSystems() {
        const rows = await this.request('/systems');
        return Array.isArray(rows) ? rows : [];
    },

    async getImprovementSettings() {
        return this.request('/settings/improvement');
    },

    async saveImprovementSettings(improvement) {
        return this.request('/settings/improvement', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ improvement })
        });
    },

    async getOptionSets(systemId) {
        const query = new URLSearchParams({ system_id: systemId });
        const rows = await this.request(`/option-sets?${query}`);
        return Array.isArray(rows) ? rows : [];
    },

    async replaceOptionSets(systemId, optionSets) {
        return this.request('/option-sets/replace', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemId, optionSets })
        });
    },

    async submitAnswers(payload) {
        if (!payload || !payload.systemId || !payload.assessmentType || !payload.formVersionId || !payload.respondentRole || !Array.isArray(payload.answers)) {
            throw new Error('ข้อมูลแบบประเมินไม่ครบถ้วน');
        }
        const saved = await this.request('/evaluations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (saved.success !== true || saved.id !== payload.id) throw new Error('Backend ไม่ยืนยันการบันทึกผลประเมิน');
        return saved;
    },

};

if (typeof window !== "undefined") window.EvaluationAPI = EvaluationAPI;
