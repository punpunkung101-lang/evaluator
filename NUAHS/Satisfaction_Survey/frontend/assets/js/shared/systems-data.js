/**
 * IT Evaluator - Information Systems Catalog (Shared Model)
 * Faculty of Allied Health Sciences, Naresuan University
 *
 * Direct Systems List (SYS001 to SYS021)
 * Hierarchy:
 *   IT System (ระบบสารสนเทศที่รับการประเมิน)
 *     └── Assessment Questions (ข้อคำถามการประเมินประสิทธิภาพและความพึงพอใจ)
 */

const DEFAULT_SYSTEMS = [
    { id: "SYS001", name: "รายชื่อบุคลากร", name_en: "Personnel Directory" },
    { id: "SYS002", name: "ระบบลาออนไลน์", name_en: "Online Leave System" },
    { id: "SYS003", name: "ลงเวลาปฏิบัติงาน", name_en: "Time & Attendance System" },
    { id: "SYS004", name: "ฐานข้อมูลงานวิจัย", name_en: "Research Database" },
    { id: "SYS005", name: "คุณสมบัติอาจารย์ผู้รับผิดชอบหลักสูตร", name_en: "Program Director Qualifications" },
    { id: "SYS006", name: "AHS KM Hub", name_en: "AHS KM Hub" },
    { id: "SYS007", name: "ภาระงานสายวิชาการ", name_en: "Academic Staff Workload" },
    { id: "SYS008", name: "ภาระงานสายสนับสนุน", name_en: "Support Staff Workload" },
    { id: "SYS009", name: "แผนปฏิบัติการประจำปี", name_en: "Annual Action Plan" },
    { id: "SYS010", name: "ระบบ KPI / แผนกลยุทธ์", name_en: "KPI & Strategic Plan System" },
    { id: "SYS011", name: "ระบบรับส่งหนังสือ", name_en: "Document Dispatch System" },
    { id: "SYS012", name: "กรรมการภายในต่างๆ", name_en: "Internal Committees System" },
    { id: "SYS013", name: "ระบบเสนอของบอิเล็กทรอนิกส์", name_en: "Electronic Budget Proposal System" },
    { id: "SYS014", name: "AHS eForm", name_en: "AHS eForm" },
    { id: "SYS015", name: "ดาวน์โหลดแบบฟอร์ม", name_en: "Form Downloads" },
    { id: "SYS016", name: "ระบบบริหารจัดการอาคารและห้อง", name_en: "Building & Room Management System" },
    { id: "SYS017", name: "ระบบบริหารจัดการครุภัณฑ์", name_en: "Asset & Equipment Management System" },
    { id: "SYS018", name: "ระบบซ่อมและบำรุงรักษา", name_en: "Repair & Maintenance System" },
    { id: "SYS019", name: "ระบบขอรับบริการจากหน่วยประชาสัมพันธ์", name_en: "Public Relations Service Request" },
    { id: "SYS020", name: "ระบบลูกหนี้เงินยืม", name_en: "Loan Debtors System" },
    { id: "SYS021", name: "ระบบ AHS e-donation", name_en: "AHS e-Donation System" }
];

const DEFAULT_ASSESSMENT_QUESTIONS = [
    { id: "Q01", order: 1, type: "efficiency", text: "สามารถดำเนินงานให้เสร็จได้อย่างรวดเร็ว", text_en: "Speed of work completion", scale: "likert5" },
    { id: "Q02", order: 2, type: "efficiency", text: "สามารถดำเนินงานได้สะดวก ไม่ยุ่งยาก", text_en: "Convenient and smooth operation", scale: "likert5" },
    { id: "Q03", order: 3, type: "efficiency", text: "ขั้นตอนการดำเนินงานมีความกระชับ ไม่ซับซ้อน", text_en: "Concise and non-redundant steps", scale: "likert5" },
    { id: "Q04", order: 4, type: "efficiency", text: "สามารถดำเนินงานได้อย่างถูกต้อง", text_en: "Accurate execution of work", scale: "likert5" },
    { id: "Q05", order: 5, type: "efficiency", text: "การดำเนินงานมีข้อผิดพลาดน้อย", text_en: "Low rate of errors", scale: "likert5" },
    { id: "Q06", order: 6, type: "efficiency", text: "สามารถดำเนินงานโดยใช้เอกสารกระดาษน้อย", text_en: "Reduced paper usage", scale: "likert5" },
    { id: "Q07", order: 7, type: "efficiency", text: "สามารถตรวจสอบหรือติดตามสถานะงานได้ง่าย", text_en: "Easy tracking and auditing of status", scale: "likert5" },
    { id: "Q08", order: 8, type: "efficiency", text: "สามารถค้นหาและเข้าถึงข้อมูลที่จำเป็นได้สะดวก", text_en: "Convenient search and access to data", scale: "likert5" },
    { id: "Q09", order: 9, type: "efficiency", text: "สามารถดำเนินงานจนบรรลุวัตถุประสงค์ที่ต้องการ", text_en: "Achieved intended operational goals", scale: "likert5" },
    { id: "Q10", order: 10, type: "efficiency", text: "สามารถดำเนินงานได้อย่างมีประสิทธิภาพโดยรวม", text_en: "Overall operational efficiency", scale: "likert5" },
    { id: "Q11", order: 11, type: "satisfaction", text: "ความสะดวกในการเข้าใช้งานและการดำเนินงานผ่านระบบ", text_en: "Ease of access and usage through system", scale: "likert5" },
    { id: "Q12", order: 12, type: "satisfaction", text: "ความรวดเร็วในการประมวลผลและการตอบสนองของระบบ", text_en: "System processing and response speed", scale: "likert5" },
    { id: "Q13", order: 13, type: "satisfaction", text: "ความถูกต้องและความน่าเชื่อถือของข้อมูลและผลลัพธ์", text_en: "Accuracy and reliability of data outputs", scale: "likert5" },
    { id: "Q14", order: 14, type: "satisfaction", text: "ความชัดเจนของหน้าจอ เมนูคำสั่ง และคู่มือการใช้งาน", text_en: "Clarity of UI, menus, and user guides", scale: "likert5" },
    { id: "Q15", order: 15, type: "satisfaction", text: "ความพึงพอใจต่อภาพรวมของการใช้งานระบบ IT นี้", text_en: "Overall satisfaction with this IT system", scale: "likert5" }
];

const STORAGE_KEY_SYSTEMS = "it_eval_systems";
const STORAGE_KEY_QUESTIONS = "it_eval_topic_questions";

function loadStoredSystems() {
    if (typeof localStorage === "undefined") return JSON.parse(JSON.stringify(DEFAULT_SYSTEMS));
    try {
        const raw = localStorage.getItem(STORAGE_KEY_SYSTEMS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Error reading systems from localStorage:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SYSTEMS));
}

function loadStoredQuestions() {
    if (typeof localStorage === "undefined") return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY_QUESTIONS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed === "object" && parsed !== null) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Error reading questions from localStorage:", e);
    }
    return {};
}

// Global active systems instance
let systems = loadStoredSystems();

// AssessmentCatalog Manager API
const AssessmentCatalog = {
    DEFAULT_SYSTEMS,
    DEFAULT_ASSESSMENT_QUESTIONS,

    getSystems() {
        return systems;
    },

    getTopics() {
        return systems;
    },

    getSystem(systemId) {
        return systems.find(s => s.id === systemId) || null;
    },

    getTopic(topicId) {
        return this.getSystem(topicId);
    },

    // Compatibility for any code expecting categories
    getCategories() {
        return [{ id: "all", name: "ระบบสารสนเทศ", name_en: "IT Systems", systems }];
    },

    saveSystems() {
        if (typeof localStorage !== "undefined") {
            try {
                localStorage.setItem(STORAGE_KEY_SYSTEMS, JSON.stringify(systems));
            } catch (e) {
                console.error("Failed to save systems to localStorage:", e);
            }
        }
        if (typeof window !== "undefined") {
            window.systems = systems;
            window.categories = [{ id: "all", name: "ระบบสารสนเทศ", name_en: "IT Systems", systems }];
            if (typeof document !== "undefined") {
                document.dispatchEvent(new CustomEvent("assessmentcatalogchange", { detail: { systems } }));
            }
        }
    },

    generateNextSystemId() {
        let maxNum = 0;
        systems.forEach(sys => {
            const match = String(sys.id).match(/SYS(\d+)/i);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        const nextNum = maxNum + 1;
        return `SYS${String(nextNum).padStart(3, "0")}`;
    },

    addSystem({ id, name, name_en }) {
        const newId = (id && id.trim()) ? id.trim() : this.generateNextSystemId();
        const existing = systems.find(s => s.id === newId);
        if (existing) {
            throw new Error(`รหัสระบบ ${newId} มีอยู่ในระบบแล้ว`);
        }

        const newSystem = {
            id: newId,
            name: (name || "").trim(),
            name_en: (name_en || "").trim()
        };

        systems.push(newSystem);
        this.saveSystems();

        // Initialize default questions for this topic
        const allQuestions = loadStoredQuestions();
        if (!allQuestions[newId]) {
            allQuestions[newId] = JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_QUESTIONS));
            try {
                localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(allQuestions));
            } catch (e) {
                console.error("Failed to initialize questions for new topic:", e);
            }
        }

        return newSystem;
    },

    addTopic(_categoryId, data) {
        return this.addSystem(data);
    },

    renameSystem(systemId, { name, name_en }) {
        const sys = systems.find(s => s.id === systemId);
        if (!sys) throw new Error("System not found: " + systemId);

        if (typeof name === "string") sys.name = name.trim();
        if (typeof name_en === "string") sys.name_en = name_en.trim();

        this.saveSystems();
        return sys;
    },

    renameTopic(systemId, data) {
        return this.renameSystem(systemId, data);
    },

    deleteSystem(systemId) {
        const idx = systems.findIndex(s => s.id === systemId);
        if (idx === -1) throw new Error("System not found: " + systemId);

        systems.splice(idx, 1);
        this.saveSystems();

        // Remove questions for this topic
        const allQuestions = loadStoredQuestions();
        if (allQuestions[systemId]) {
            delete allQuestions[systemId];
            try {
                localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(allQuestions));
            } catch (e) {
                console.error("Failed to delete questions for topic:", e);
            }
        }
        return true;
    },

    deleteTopic(systemId) {
        return this.deleteSystem(systemId);
    },

    /* Questions API */
    getQuestionsForTopic(systemId) {
        const allQuestions = loadStoredQuestions();
        if (allQuestions[systemId] && Array.isArray(allQuestions[systemId])) {
            return allQuestions[systemId];
        }
        return JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_QUESTIONS));
    },

    saveQuestionsForTopic(systemId, questions) {
        const allQuestions = loadStoredQuestions();
        allQuestions[systemId] = questions;
        if (typeof localStorage !== "undefined") {
            try {
                localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(allQuestions));
            } catch (e) {
                console.error("Failed to save questions to localStorage:", e);
            }
        }
        if (typeof document !== "undefined") {
            document.dispatchEvent(new CustomEvent("assessmentquestionschange", { detail: { systemId, questions } }));
        }
    },

    addQuestion(systemId, { type, text, text_en, scale, order }) {
        const qList = this.getQuestionsForTopic(systemId);
        const nextOrder = order || (qList.length + 1);
        const nextId = `Q${String(qList.length + 1).padStart(2, "0")}_${Date.now().toString(36).substr(-4)}`;

        const newQ = {
            id: nextId,
            order: nextOrder,
            type: type || "efficiency",
            text: (text || "").trim(),
            text_en: (text_en || "").trim(),
            scale: scale || "likert5"
        };

        qList.push(newQ);
        qList.sort((a, b) => a.order - b.order);
        this.saveQuestionsForTopic(systemId, qList);
        return newQ;
    },

    updateQuestion(systemId, questionId, { text, text_en, type, scale, order }) {
        const qList = this.getQuestionsForTopic(systemId);
        const q = qList.find(item => item.id === questionId);
        if (!q) throw new Error("Question not found: " + questionId);

        if (typeof text === "string") q.text = text.trim();
        if (typeof text_en === "string") q.text_en = text_en.trim();
        if (typeof type === "string") q.type = type;
        if (typeof scale === "string") q.scale = scale;
        if (typeof order === "number") q.order = order;

        qList.sort((a, b) => a.order - b.order);
        this.saveQuestionsForTopic(systemId, qList);
        return q;
    },

    deleteQuestion(systemId, questionId) {
        let qList = this.getQuestionsForTopic(systemId);
        qList = qList.filter(item => item.id !== questionId);
        qList.forEach((q, idx) => { q.order = idx + 1; });
        this.saveQuestionsForTopic(systemId, qList);
        return true;
    },

    resetAllToDefaults() {
        if (typeof localStorage !== "undefined") {
            localStorage.removeItem(STORAGE_KEY_SYSTEMS);
            localStorage.removeItem(STORAGE_KEY_QUESTIONS);
        }
        systems = JSON.parse(JSON.stringify(DEFAULT_SYSTEMS));
        this.saveSystems();
        return systems;
    }
};

// Expose globals for scripts
if (typeof window !== "undefined") {
    window.systems = systems;
    window.categories = [{ id: "all", name: "ระบบสารสนเทศ", name_en: "IT Systems", systems }];
    window.AssessmentCatalog = AssessmentCatalog;

    if (!window.getSystemName) {
        window.getSystemName = function (system, lang) {
            if (!system) return "";
            const l = lang || (window.ThemeLang ? window.ThemeLang.getLang() : (localStorage.getItem("it_eval_lang") || "th"));
            if (l === "en" && system.name_en) return system.name_en;
            return system.name || "";
        };
    }

    if (!window.getCategoryName) {
        window.getCategoryName = function (_cat, _lang) {
            return "ระบบสารสนเทศ";
        };
    }
}
