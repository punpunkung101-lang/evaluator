/**
 * API and Data Access Layer for IT Evaluator (Shared Module)
 * Faculty of Allied Health Sciences, Naresuan University
 * 
 * Supports:
 * - Supabase REST API (if configured)
 * - Custom Backend REST API (if configured)
 * - Browser Local Persistence (for user evaluations submitted locally)
 * - Decoupled data fetch and transformation interfaces
 */

const API_CONFIG = {
    // Configurable endpoint URLs or storage keys
    supabaseUrl: (typeof window !== "undefined" && window.ENV?.SUPABASE_URL) || null,
    supabaseAnonKey: (typeof window !== "undefined" && window.ENV?.SUPABASE_ANON_KEY) || null,
    backendBaseUrl: (typeof window !== "undefined" && window.ENV?.API_BASE_URL) || null,
    localStorageKey: "it_evaluations_store"
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
 *   satisfactionAnswers: number[],   // 5 items, 1-5
 *   satisfactionAverage?: number,
 *   feedback?: string,
 *   submittedAt: string              // ISO date string YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
 * }
 */

const EvaluationAPI = {
    /**
     * Submit an evaluation record from user-side
     */
    async submitEvaluation(record) {
        const payload = this.normalizeRecord(record);

        // 1. If backend API is configured
        if (API_CONFIG.backendBaseUrl) {
            try {
                const response = await fetch(`${API_CONFIG.backendBaseUrl}/evaluations`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (err) {
                console.warn("Backend API submit failed, falling back to local storage:", err);
            }
        }

        // 2. If Supabase is configured
        if (API_CONFIG.supabaseUrl && API_CONFIG.supabaseAnonKey) {
            try {
                const response = await fetch(`${API_CONFIG.supabaseUrl}/rest/v1/evaluations`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": API_CONFIG.supabaseAnonKey,
                        "Authorization": `Bearer ${API_CONFIG.supabaseAnonKey}`,
                        "Prefer": "return=representation"
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(`Supabase error! status: ${response.status}`);
                return await response.json();
            } catch (err) {
                console.warn("Supabase submit failed, falling back to local storage:", err);
            }
        }

        // 3. Fallback: Save to LocalStorage so evaluations are persistently available to the admin dashboard
        return this.saveToLocalStorage(payload);
    },

    /**
     * Fetch all evaluation records for admin dashboard
     * Returns: { success: boolean, data: Array, source: string, error?: string }
     */
    async getEvaluations() {
        // 1. Try Backend API if configured
        if (API_CONFIG.backendBaseUrl) {
            try {
                const response = await fetch(`${API_CONFIG.backendBaseUrl}/evaluations`);
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                const data = await response.json();
                const sanitized = Array.isArray(data) ? data.map(item => this.normalizeRecord(item)) : [];
                return { success: true, data: sanitized, source: "backend" };
            } catch (err) {
                return { success: false, data: [], error: `Backend API error: ${err.message}`, source: "backend" };
            }
        }

        // 2. Try Supabase if configured
        if (API_CONFIG.supabaseUrl && API_CONFIG.supabaseAnonKey) {
            try {
                const response = await fetch(`${API_CONFIG.supabaseUrl}/rest/v1/evaluations?select=*`, {
                    headers: {
                        "apikey": API_CONFIG.supabaseAnonKey,
                        "Authorization": `Bearer ${API_CONFIG.supabaseAnonKey}`
                    }
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                const data = await response.json();
                const sanitized = Array.isArray(data) ? data.map(item => this.normalizeRecord(item)) : [];
                return { success: true, data: sanitized, source: "supabase" };
            } catch (err) {
                return { success: false, data: [], error: `Supabase error: ${err.message}`, source: "supabase" };
            }
        }

        // 3. Ingest real submitted user evaluation data from browser storage
        try {
            const raw = localStorage.getItem(API_CONFIG.localStorageKey);
            const list = raw ? JSON.parse(raw) : [];
            const sanitized = Array.isArray(list) ? list.map(item => this.normalizeRecord(item)) : [];
            return { success: true, data: sanitized, source: "local" };
        } catch (err) {
            return { success: false, data: [], error: `Failed to load local data: ${err.message}`, source: "local" };
        }
    },

    /**
     * Helper to save a single record to local storage
     */
    saveToLocalStorage(record) {
        try {
            const raw = localStorage.getItem(API_CONFIG.localStorageKey);
            const list = raw ? JSON.parse(raw) : [];
            list.push(record);
            localStorage.setItem(API_CONFIG.localStorageKey, JSON.stringify(list));
            return record;
        } catch (err) {
            console.error("Failed to save to localStorage:", err);
            return record;
        }
    },

    /**
     * Import multiple records from a JSON file (admin data ingestion)
     */
    importEvaluationsJSON(jsonString) {
        try {
            const parsed = typeof jsonString === "string" ? JSON.parse(jsonString) : jsonString;
            const records = Array.isArray(parsed) ? parsed : (parsed.evaluations || [parsed]);
            const sanitized = records.map(r => this.normalizeRecord(r));
            
            const raw = localStorage.getItem(API_CONFIG.localStorageKey);
            const list = raw ? JSON.parse(raw) : [];
            
            // Deduplicate by ID
            const existingIds = new Set(list.map(item => item.id));
            let addedCount = 0;
            sanitized.forEach(rec => {
                if (!existingIds.has(rec.id)) {
                    list.push(rec);
                    existingIds.add(rec.id);
                    addedCount++;
                }
            });

            localStorage.setItem(API_CONFIG.localStorageKey, JSON.stringify(list));
            return { success: true, count: addedCount, total: list.length };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    /**
     * Clear all stored evaluations (useful for admin testing/reset)
     */
    clearLocalStorage() {
        localStorage.removeItem(API_CONFIG.localStorageKey);
    },

    /**
     * Normalize & validate evaluation record schema to prevent dashboard crashes
     */
    normalizeRecord(raw) {
        if (!raw || typeof raw !== "object") raw = {};

        const toFloatOrNull = v => {
            const num = parseFloat(v);
            return !isNaN(num) && num >= 1 && num <= 5 ? num : null;
        };

        const beforeAnswers = Array.isArray(raw.beforeAnswers)
            ? raw.beforeAnswers.slice(0, 10).map(toFloatOrNull)
            : Array(10).fill(null);
        while (beforeAnswers.length < 10) beforeAnswers.push(null);

        const afterAnswers = Array.isArray(raw.afterAnswers)
            ? raw.afterAnswers.slice(0, 10).map(toFloatOrNull)
            : Array(10).fill(null);
        while (afterAnswers.length < 10) afterAnswers.push(null);

        const satisfactionAnswers = Array.isArray(raw.satisfactionAnswers)
            ? raw.satisfactionAnswers.slice(0, 5).map(v => {
                const num = parseFloat(v);
                return !isNaN(num) && num >= 1 && num <= 5 ? num : 0;
            })
            : Array(5).fill(0);
        while (satisfactionAnswers.length < 5) satisfactionAnswers.push(0);

        const validSat = satisfactionAnswers.filter(s => s > 0);
        const satAvg = validSat.length > 0
            ? validSat.reduce((a, b) => a + b, 0) / validSat.length
            : null;

        const dateStr = raw.submittedAt || new Date().toISOString();

        return {
            id: raw.id || `eval_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            systemId: String(raw.systemId || "").trim(),
            systemName: raw.systemName || "",
            evaluatorId: raw.evaluatorId || `evaluator_${Date.now()}`,
            evaluatorName: raw.evaluatorName || "ไม่ระบุชื่อ",
            userRole: ["student", "teacher", "staff"].includes(raw.userRole) ? raw.userRole : "student",
            beforeAnswers,
            afterAnswers,
            satisfactionAnswers,
            satisfactionAverage: satAvg,
            feedback: typeof raw.feedback === "string" ? raw.feedback.trim() : "",
            submittedAt: String(dateStr).slice(0, 19).replace("T", " ")
        };
    }
};

if (typeof window !== "undefined") {
    window.EvaluationAPI = EvaluationAPI;
}
