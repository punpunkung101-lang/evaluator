/**
 * IT Evaluator - Information Systems Catalog & Categories (Shared Model)
 * Faculty of Allied Health Sciences, Naresuan University
 *
 * Hierarchy:
 *  Main Category (หมวดหมู่หลัก)
 *    └── Assessment Topic / IT System (หัวข้อการประเมิน / ระบบ IT)
 *          └── Questions (ข้อคำถามการประเมินประสิทธิภาพและความพึงพอใจ)
 */

const DEFAULT_CATEGORIES = [
    {
        id: "personnel",
        name: "บุคลากรและการปฏิบัติงาน",
        name_en: "Personnel & Operations",
        image: "personnel.jpg",
        systems: [
            { id: "SYS001", name: "รายชื่อบุคลากร", name_en: "Personnel Directory" },
            { id: "SYS002", name: "ระบบลาออนไลน์", name_en: "Online Leave System" },
            { id: "SYS003", name: "ลงเวลาปฏิบัติงาน", name_en: "Time & Attendance System" }
        ]
    },
    {
        id: "research",
        name: "วิจัยและวิชาการ",
        name_en: "Research & Academics",
        image: "research.jpg",
        systems: [
            { id: "SYS004", name: "ฐานข้อมูลงานวิจัย", name_en: "Research Database" },
            { id: "SYS005", name: "คุณสมบัติอาจารย์ผู้รับผิดชอบหลักสูตร", name_en: "Program Director Qualifications" },
            { id: "SYS006", name: "AHS KM Hub", name_en: "AHS KM Hub" }
        ]
    },
    {
        id: "workload",
        name: "ภาระงานและแผนยุทธศาสตร์",
        name_en: "Workload & Strategic Planning",
        image: "workload.jpg",
        systems: [
            { id: "SYS007", name: "ภาระงานสายวิชาการ", name_en: "Academic Staff Workload" },
            { id: "SYS008", name: "ภาระงานสายสนับสนุน", name_en: "Support Staff Workload" },
            { id: "SYS009", name: "แผนปฏิบัติการประจำปี", name_en: "Annual Action Plan" },
            { id: "SYS010", name: "ระบบ KPI / แผนกลยุทธ์", name_en: "KPI & Strategic Plan System" }
        ]
    },
    {
        id: "documents",
        name: "สารบรรณและเอกสาร",
        name_en: "Documents & General Correspondence",
        image: "documents.jpg",
        systems: [
            { id: "SYS011", name: "ระบบรับส่งหนังสือ", name_en: "Document Dispatch System" },
            { id: "SYS012", name: "กรรมการภายในต่างๆ", name_en: "Internal Committees System" },
            { id: "SYS013", name: "ระบบเสนอของบอิเล็กทรอนิกส์", name_en: "Electronic Budget Proposal System" },
            { id: "SYS014", name: "AHS eForm", name_en: "AHS eForm" },
            { id: "SYS015", name: "ดาวน์โหลดแบบฟอร์ม", name_en: "Form Downloads" }
        ]
    },
    {
        id: "resources",
        name: "ทรัพยากรและบริการ",
        name_en: "Resources & Services",
        image: "resources.jpg",
        systems: [
            { id: "SYS016", name: "ระบบบริหารจัดการอาคารและห้อง", name_en: "Building & Room Management System" },
            { id: "SYS017", name: "ระบบบริหารจัดการครุภัณฑ์", name_en: "Asset & Equipment Management System" },
            { id: "SYS018", name: "ระบบซ่อมและบำรุงรักษา", name_en: "Repair & Maintenance System" },
            { id: "SYS019", name: "ระบบขอรับบริการจากหน่วยประชาสัมพันธ์", name_en: "Public Relations Service Request" }
        ]
    },
    {
        id: "finance",
        name: "การเงิน",
        name_en: "Finance & Accounting",
        image: "finance.jpg",
        systems: [
            { id: "SYS020", name: "ระบบลูกหนี้เงินยืม", name_en: "Loan Debtors System" },
            { id: "SYS021", name: "ระบบ AHS e-donation", name_en: "AHS e-Donation System" }
        ]
    }
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

const STORAGE_KEY_CATEGORIES = "it_eval_categories";
const STORAGE_KEY_QUESTIONS = "it_eval_topic_questions";

function loadStoredCategories() {
    if (typeof localStorage === "undefined") return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    try {
        const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Error reading categories from localStorage:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
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

// Global active categories instance
let categories = loadStoredCategories();

// AssessmentCatalog Manager API
const AssessmentCatalog = {
    DEFAULT_CATEGORIES,
    DEFAULT_ASSESSMENT_QUESTIONS,

    getCategories() {
        return categories;
    },

    getCategory(categoryId) {
        return categories.find(c => c.id === categoryId) || null;
    },

    saveCategories() {
        if (typeof localStorage !== "undefined") {
            try {
                localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
            } catch (e) {
                console.error("Failed to save categories to localStorage:", e);
            }
        }
        if (typeof window !== "undefined") {
            window.categories = categories;
            if (typeof document !== "undefined") {
                document.dispatchEvent(new CustomEvent("assessmentcatalogchange", { detail: { categories } }));
            }
        }
    },

    generateNextSystemId() {
        let maxNum = 0;
        categories.forEach(cat => {
            (cat.systems || []).forEach(sys => {
                const match = String(sys.id).match(/SYS(\d+)/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            });
        });
        const nextNum = maxNum + 1;
        return `SYS${String(nextNum).padStart(3, "0")}`;
    },

    addTopic(categoryId, { id, name, name_en }) {
        const cat = this.getCategory(categoryId);
        if (!cat) throw new Error("Category not found: " + categoryId);

        const newId = (id && id.trim()) ? id.trim() : this.generateNextSystemId();
        const newTopic = {
            id: newId,
            name: (name || "").trim(),
            name_en: (name_en || "").trim()
        };

        if (!cat.systems) cat.systems = [];
        cat.systems.push(newTopic);
        this.saveCategories();

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

        return newTopic;
    },

    renameTopic(systemId, { name, name_en }) {
        let found = null;
        for (const cat of categories) {
            const sys = (cat.systems || []).find(s => s.id === systemId);
            if (sys) {
                if (typeof name === "string") sys.name = name.trim();
                if (typeof name_en === "string") sys.name_en = name_en.trim();
                found = sys;
                break;
            }
        }
        if (!found) throw new Error("System not found: " + systemId);
        this.saveCategories();
        return found;
    },

    deleteTopic(systemId) {
        let removed = false;
        for (const cat of categories) {
            if (cat.systems && cat.systems.some(s => s.id === systemId)) {
                cat.systems = cat.systems.filter(s => s.id !== systemId);
                removed = true;
                break;
            }
        }
        if (!removed) throw new Error("System not found: " + systemId);
        this.saveCategories();

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

    getQuestions(systemId) {
        const allQuestions = loadStoredQuestions();
        if (allQuestions[systemId] && Array.isArray(allQuestions[systemId])) {
            return allQuestions[systemId];
        }
        // Initialize default questions if not set
        const defaults = JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_QUESTIONS));
        allQuestions[systemId] = defaults;
        if (typeof localStorage !== "undefined") {
            try {
                localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(allQuestions));
            } catch (e) {
                console.error("Failed to cache default questions:", e);
            }
        }
        return defaults;
    },

    saveQuestion(systemId, questionData) {
        const list = this.getQuestions(systemId).slice();
        if (questionData.id) {
            const idx = list.findIndex(q => q.id === questionData.id);
            if (idx >= 0) {
                list[idx] = {
                    ...list[idx],
                    text: (questionData.text || "").trim(),
                    text_en: (questionData.text_en || "").trim(),
                    type: questionData.type || list[idx].type || "efficiency",
                    scale: questionData.scale || list[idx].scale || "likert5",
                    order: Number(questionData.order) || list[idx].order || (idx + 1)
                };
            } else {
                list.push({
                    id: questionData.id,
                    text: (questionData.text || "").trim(),
                    text_en: (questionData.text_en || "").trim(),
                    type: questionData.type || "efficiency",
                    scale: questionData.scale || "likert5",
                    order: Number(questionData.order) || (list.length + 1)
                });
            }
        } else {
            const nextOrder = list.length + 1;
            const newId = `Q${String(nextOrder).padStart(2, "0")}_${Date.now().toString(36)}`;
            list.push({
                id: newId,
                text: (questionData.text || "").trim(),
                text_en: (questionData.text_en || "").trim(),
                type: questionData.type || "efficiency",
                scale: questionData.scale || "likert5",
                order: Number(questionData.order) || nextOrder
            });
        }

        // Sort by order
        list.sort((a, b) => (a.order || 0) - (b.order || 0));

        const allQuestions = loadStoredQuestions();
        allQuestions[systemId] = list;
        if (typeof localStorage !== "undefined") {
            try {
                localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(allQuestions));
            } catch (e) {
                console.error("Failed to save questions:", e);
            }
        }
        if (typeof document !== "undefined") {
            document.dispatchEvent(new CustomEvent("assessmentcatalogchange", { detail: { systemId, questions: list } }));
        }
        return list;
    },

    deleteQuestion(systemId, questionId) {
        const list = this.getQuestions(systemId).filter(q => q.id !== questionId);
        const allQuestions = loadStoredQuestions();
        allQuestions[systemId] = list;
        if (typeof localStorage !== "undefined") {
            try {
                localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(allQuestions));
            } catch (e) {
                console.error("Failed to delete question:", e);
            }
        }
        if (typeof document !== "undefined") {
            document.dispatchEvent(new CustomEvent("assessmentcatalogchange", { detail: { systemId, questions: list } }));
        }
        return list;
    },

    resetDefaults() {
        if (typeof localStorage !== "undefined") {
            try {
                localStorage.removeItem(STORAGE_KEY_CATEGORIES);
                localStorage.removeItem(STORAGE_KEY_QUESTIONS);
            } catch (e) {
                console.error("Failed to clear localStorage:", e);
            }
        }
        categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
        if (typeof window !== "undefined") {
            window.categories = categories;
            if (typeof document !== "undefined") {
                document.dispatchEvent(new CustomEvent("assessmentcatalogchange", { detail: { categories, reset: true } }));
            }
        }
        return categories;
    }
};

if (typeof window !== "undefined") {
    window.categories = categories;
    window.AssessmentCatalog = AssessmentCatalog;

    if (!window.getCategoryName) {
        window.getCategoryName = function (category, lang) {
            if (!category) return "";
            const l = lang || (window.ThemeLang ? window.ThemeLang.getLang() : (localStorage.getItem("it_eval_lang") || "th"));
            if (l === "en" && category.name_en) return category.name_en;
            return category.name || "";
        };
    }
    if (!window.getSystemName) {
        window.getSystemName = function (system, lang) {
            if (!system) return "";
            const l = lang || (window.ThemeLang ? window.ThemeLang.getLang() : (localStorage.getItem("it_eval_lang") || "th"));
            if (l === "en" && system.name_en) return system.name_en;
            return system.name || "";
        };
    }
}
