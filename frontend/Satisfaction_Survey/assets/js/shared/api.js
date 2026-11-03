/** Shared API for the evaluator C++/SQLite backend. */
const API_CONFIG = {
    backendBaseUrl: (typeof window !== "undefined" && window.ENV?.API_BASE_URL) || "http://localhost:8080"
};

/**
 * Standard Evaluation Record Schema:
 * {
 *   id: string,
 *   systemId: string,
 *   systemName?: string,
 *   evaluatorId: string,
 *   evaluatorName?: string,
 *   userRole: "student" | "teacher" | "staff",
 *   beforeAnswers: (number | null)[], // 10 items, 1-5 or null
 *   afterAnswers: (number | null)[],  // 10 items, 1-5 or null
 *   satisfactionAnswers: number[],   // One score per question, 1-5
 *   satisfactionAverage?: number,
 *   feedback?: string,
 *   submittedAt: string              // ISO date string YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
 * }
 */

const EvaluationAPI = {
    async request(path, options = {}) {
        let response;
        try {
            response = await fetch(`${API_CONFIG.backendBaseUrl}${path}`, options);
        } catch (error) {
            throw new Error(`ไม่สามารถเชื่อมต่อ C++ Backend (${API_CONFIG.backendBaseUrl}): ${error.message}`);
        }
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `Backend ตอบกลับ HTTP ${response.status}`);
        return body;
    },

    async submitEvaluation(record) {
        const payload = this.normalizeRecord(record);
        const saved = await this.request("/evaluations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (saved.success !== true || saved.id !== payload.id) throw new Error("Backend ไม่ยืนยันการบันทึกผลประเมิน");
        return saved;
    },

    async getEvaluations() {
        try {
            const data = await this.request("/evaluations");
            return { success: true, data: Array.isArray(data) ? data.map(item => this.normalizeRecord(item)) : [], source: "backend" };
        } catch (error) {
            return { success: false, data: [], error: error.message, source: "backend" };
        }
    },

    async importEvaluationsJSON(jsonString) {
        try {
            const parsed = typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
            const records = Array.isArray(parsed) ? parsed : (parsed.evaluations || [parsed]);
            const current = await this.request("/evaluations");
            const existingIds = new Set(current.map(item => item.id));
            let count = 0;
            for (const raw of records) {
                const record = this.normalizeRecord(raw);
                if (existingIds.has(record.id)) continue;
                await this.submitEvaluation(record);
                existingIds.add(record.id);
                count++;
            }
            return { success: true, count, total: existingIds.size };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async clearEvaluations() {
        return this.request("/evaluations", { method: "DELETE" });
    },

    normalizeRecord(raw) {
        if (!raw || typeof raw !== "object") raw = {};
        const toFloatOrNull = value => {
            const number = parseFloat(value);
            return !isNaN(number) && number >= 1 && number <= 5 ? number : null;
        };
        const beforeAnswers = Array.isArray(raw.beforeAnswers) ? raw.beforeAnswers.slice(0, 10).map(toFloatOrNull) : Array(10).fill(null);
        while (beforeAnswers.length < 10) beforeAnswers.push(null);
        const afterAnswers = Array.isArray(raw.afterAnswers) ? raw.afterAnswers.slice(0, 10).map(toFloatOrNull) : Array(10).fill(null);
        while (afterAnswers.length < 10) afterAnswers.push(null);

        const satisfactionAnswers = Array.isArray(raw.satisfactionAnswers)
            ? raw.satisfactionAnswers.map(v => {
                const num = parseFloat(v);
                return !isNaN(num) && num >= 1 && num <= 5 ? num : 0;
            })
            : Array(5).fill(0);

        const validSat = satisfactionAnswers.filter(s => s > 0);
        const satAvg = validSat.length > 0
            ? validSat.reduce((a, b) => a + b, 0) / validSat.length
            : null;

        return {
            id: raw.id || `eval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            systemId: String(raw.systemId || "").trim(),
            systemName: raw.systemName || "",
            evaluatorId: raw.evaluatorId || `evaluator_${Date.now()}`,
            evaluatorName: raw.evaluatorName || "ไม่ระบุชื่อ",
            userRole: ["student", "teacher", "staff"].includes(raw.userRole) ? raw.userRole : "student",
            beforeAnswers,
            afterAnswers,
            beforeAverage: Number.isFinite(raw.beforeAverage) ? raw.beforeAverage : null,
            afterAverage: Number.isFinite(raw.afterAverage) ? raw.afterAverage : null,
            comparableCount: Number.isInteger(raw.comparableCount) ? raw.comparableCount : 0,
            satisfactionAnswers,
            ...(Array.isArray(raw.satisfactionQuestions) ? { satisfactionQuestions: raw.satisfactionQuestions } : {}),
            satisfactionAverage: satAvg,
            feedback: typeof raw.feedback === "string" ? raw.feedback.trim() : "",
            submittedAt: String(raw.submittedAt || new Date().toISOString()).slice(0, 19).replace("T", " ")
        };
    }
};

if (typeof window !== "undefined") window.EvaluationAPI = EvaluationAPI;
