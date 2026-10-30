/**
 * IT Evaluator - Information Systems Catalog & Categories (Shared Model)
 * Faculty of Allied Health Sciences, Naresuan University
 */

const categories = [
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

if (typeof window !== "undefined") {
    window.categories = categories;

    // Helper functions if theme-lang.js is not loaded yet
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
