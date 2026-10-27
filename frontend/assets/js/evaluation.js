
// 1. อ่านรหัสระบบจาก URL
const params = new URLSearchParams(window.location.search);
const systemId = params.get("system");

// 2. ค้นหาระบบ IT จากข้อมูลทุกหมวดหมู่
let selectedSystem = null;

for (const category of categories) {
    const found = category.systems.find(
        system => system.id === systemId
    );

    if (found) {
        selectedSystem = found;
        break;
    }
}

// 3. แสดงชื่อระบบที่เลือก
const systemName = document.getElementById("system-name");
const form = document.getElementById("evaluation-form");

if (selectedSystem) {
    systemName.textContent = selectedSystem.name;
} else {
    systemName.textContent = "ไม่พบระบบ IT ที่เลือก";
    form.hidden = true;
}

// 4. กำหนดข้อมูลตัวชี้วัด
const metrics = {
    time: {
        name: "ระยะเวลาดำเนินงาน",
        unit: "นาที",
        type: "decrease"
    },
    steps: {
        name: "จำนวนขั้นตอน",
        unit: "ขั้นตอน",
        type: "decrease"
    },
    paper: {
        name: "จำนวนกระดาษที่ใช้",
        unit: "แผ่น",
        type: "decrease"
    },
    errors: {
        name: "จำนวนข้อผิดพลาด",
        unit: "ครั้ง",
        type: "decrease"
    },
    success: {
        name: "อัตราความสำเร็จของงาน",
        unit: "%",
        type: "increase"
    }
};

// 5. เลือกส่วนต่าง ๆ ของหน้า HTML
const metricSelect = document.getElementById("metric");
const metricUnit = document.getElementById("metric-unit");
const metricExample = document.getElementById("metric-example");
const beforeInput = document.getElementById("before-value");
const afterInput = document.getElementById("after-value");

const resultBox = document.getElementById("result-box");
const resultDescription = document.getElementById(
    "result-description"
);
const resultPercentage = document.getElementById(
    "result-percentage"
);
const resultMessage = document.getElementById("result-message");

// 6. แสดงหน่วยตามตัวชี้วัดที่เลือก

function updateMetricUnit() {
    const metric = metrics[metricSelect.value];

    metricUnit.textContent =
        `หน่วยที่ใช้กรอก: ${metric.unit}`;

    const examples = {
        time: "กรอกเป็นนาทีเท่านั้น เช่น ก่อน 30 นาที หลัง 2 นาที หากใช้เวลา 1 ชั่วโมง ให้กรอก 60",
        steps: "กรอกเป็นจำนวนขั้นตอน เช่น ก่อน 8 ขั้นตอน หลัง 3 ขั้นตอน",
        paper: "กรอกเป็นจำนวนแผ่น เช่น ก่อน 10 แผ่น หลัง 2 แผ่น",
        errors: "กรอกเป็นจำนวนครั้งที่เกิดข้อผิดพลาด เช่น ก่อน 5 ครั้ง หลัง 1 ครั้ง โดยเปรียบเทียบจากจำนวนงานเท่ากัน",
        success: "กรอกเป็นเปอร์เซ็นต์ตั้งแต่ 0 ถึง 100 เช่น ก่อน 70 หลัง 95 ไม่ต้องพิมพ์เครื่องหมาย %"
    };

    metricExample.textContent = examples[metricSelect.value];

    resultBox.hidden = true;

    if (metricSelect.value === "success") {
        beforeInput.max = "100";
        afterInput.max = "100";
    } else {
        beforeInput.removeAttribute("max");
        afterInput.removeAttribute("max");
    }
}


metricSelect.addEventListener("change", updateMetricUnit);
updateMetricUnit();

// 7. คำนวณเมื่อกดปุ่ม
form.addEventListener("submit", function(event) {

    // ป้องกันหน้าเว็บรีเฟรช
    event.preventDefault();

    const before = Number(beforeInput.value);
    const after = Number(afterInput.value);

    const metric = metrics[metricSelect.value];

    // ตรวจสอบค่าที่กรอก
    if (
        beforeInput.value.trim() === "" ||
        afterInput.value.trim() === "" ||
        !Number.isFinite(before) ||
        !Number.isFinite(after) ||
        before < 0 ||
        after < 0
    ) {
        alert("กรุณากรอกตัวเลขที่ถูกต้อง");
        return;
    }

    let result;
    let description;
    let message;

    if (metric.type === "decrease") {

        // ไม่สามารถหารด้วยศูนย์ได้
        if (before === 0) {
            alert(
                "ค่า 'ก่อนใช้ระบบ' ต้องมากกว่า 0 " +
                "จึงจะคำนวณเปอร์เซ็นต์การลดลงได้"
            );
            return;
        }

        // สูตรเปอร์เซ็นต์การลดลง
        result = ((before - after) / before) * 100;

        description = `${metric.name}เปลี่ยนแปลง`;

        if (result > 0) {
            message = "ลดลงจากก่อนใช้ระบบ";
        } else if (result < 0) {
            message = "เพิ่มขึ้นจากก่อนใช้ระบบ";
        } else {
            message = "ไม่มีการเปลี่ยนแปลง";
        }

        resultPercentage.textContent =
            `${Math.abs(result).toFixed(2)}%`;

    } else {

        // อัตราความสำเร็จใช้หน่วยจุดเปอร์เซ็นต์
        if (before > 100 || after > 100) {
            alert("อัตราความสำเร็จต้องไม่เกิน 100%");
            return;
        }

        result = after - before;

        description = "การเปลี่ยนแปลงอัตราความสำเร็จของงาน";

        if (result > 0) {
            message = "อัตราความสำเร็จเพิ่มขึ้น";
        } else if (result < 0) {
            message = "อัตราความสำเร็จลดลง";
        } else {
            message = "อัตราความสำเร็จไม่เปลี่ยนแปลง";
        }

        resultPercentage.textContent =
            `${Math.abs(result).toFixed(2)} จุดเปอร์เซ็นต์`;
    }

    // 8. แสดงผลบนหน้าเว็บ
    resultDescription.textContent = description;
    resultMessage.textContent = message;
    resultBox.hidden = false;

    // เลื่อนหน้าจอไปยังผลลัพธ์
    resultBox.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
});
