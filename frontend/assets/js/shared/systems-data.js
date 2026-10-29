/**
 * IT Evaluator - Information Systems Catalog & Categories (Shared Model)
 * Faculty of Allied Health Sciences, Naresuan University
 */

const categories = [
    {
        id: "personnel",
        name: "บุคลากรและการปฏิบัติงาน",
        image: "personnel.jpg",
        systems: [
            { id: "SYS001", name: "รายชื่อบุคลากร" },
            { id: "SYS002", name: "ระบบลาออนไลน์" },
            { id: "SYS003", name: "ลงเวลาปฏิบัติงาน" }
        ]
    },
    {
        id: "research",
        name: "วิจัยและวิชาการ",
        image: "research.jpg",
        systems: [
            { id: "SYS004", name: "ฐานข้อมูลงานวิจัย" },
            { id: "SYS005", name: "คุณสมบัติอาจารย์ผู้รับผิดชอบหลักสูตร" },
            { id: "SYS006", name: "AHS KM Hub" }
        ]
    },
    {
        id: "workload",
        name: "ภาระงานและแผนยุทธศาสตร์",
        image: "workload.jpg",
        systems: [
            { id: "SYS007", name: "ภาระงานสายวิชาการ" },
            { id: "SYS008", name: "ภาระงานสายสนับสนุน" },
            { id: "SYS009", name: "แผนปฏิบัติการประจำปี" },
            { id: "SYS010", name: "ระบบ KPI / แผนกลยุทธ์" }
        ]
    },
    {
        id: "documents",
        name: "สารบรรณและเอกสาร",
        image: "documents.jpg",
        systems: [
            { id: "SYS011", name: "ระบบรับส่งหนังสือ" },
            { id: "SYS012", name: "กรรมการภายในต่างๆ" },
            { id: "SYS013", name: "ระบบเสนอของบอิเล็กทรอนิกส์" },
            { id: "SYS014", name: "AHS eForm" },
            { id: "SYS015", name: "ดาวน์โหลดแบบฟอร์ม" }
        ]
    },
    {
        id: "resources",
        name: "ทรัพยากรและบริการ",
        image: "resources.jpg",
        systems: [
            { id: "SYS016", name: "ระบบบริหารจัดการอาคารและห้อง" },
            { id: "SYS017", name: "ระบบบริหารจัดการครุภัณฑ์" },
            { id: "SYS018", name: "ระบบซ่อมและบำรุงรักษา" },
            { id: "SYS019", name: "ระบบขอรับบริการจากหน่วยประชาสัมพันธ์" }
        ]
    },
    {
        id: "finance",
        name: "การเงิน",
        image: "finance.jpg",
        systems: [
            { id: "SYS020", name: "ระบบลูกหนี้เงินยืม" },
            { id: "SYS021", name: "ระบบ AHS e-donation" }
        ]
    }
];

if (typeof window !== "undefined") {
    window.categories = categories;
}
