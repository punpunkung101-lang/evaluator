
// =====================================
// 1. ค้นหาระบบ IT ที่ผู้ใช้เลือก
// =====================================

const params = new URLSearchParams(window.location.search);
const systemId = params.get("system");

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

const systemName = document.getElementById("system-name");

if (selectedSystem) {
    systemName.textContent = selectedSystem.name;
} else {
    systemName.textContent = "ไม่พบระบบ IT ที่เลือก";
    document.getElementById("start-btn").disabled = true;
}

// =====================================
// 2. คำถามประเมิน 10 ข้อ
// =====================================

const questions = [
    "สามารถดำเนินงานให้เสร็จได้อย่างรวดเร็ว",
    "สามารถดำเนินงานได้สะดวก ไม่ยุ่งยาก",
    "ขั้นตอนการดำเนินงานมีความกระชับ ไม่ซับซ้อน",
    "สามารถดำเนินงานได้อย่างถูกต้อง",
    "การดำเนินงานมีข้อผิดพลาดน้อย",
    "สามารถดำเนินงานโดยใช้เอกสารกระดาษน้อย",
    "สามารถตรวจสอบหรือติดตามสถานะงานได้ง่าย",
    "สามารถค้นหาและเข้าถึงข้อมูลที่จำเป็นได้สะดวก",
    "สามารถดำเนินงานจนบรรลุวัตถุประสงค์ที่ต้องการ",
    "สามารถดำเนินงานได้อย่างมีประสิทธิภาพโดยรวม"
];

// คะแนน 1-5
const ratingLabels = [
    "",
    "น้อยที่สุด",
    "น้อย",
    "ปานกลาง",
    "มาก",
    "มากที่สุด"
];

// =====================================
// 3. เก็บคำตอบก่อนและหลังใช้ระบบ
// =====================================

let answers = {
    before: Array(10).fill(undefined),
    after: Array(10).fill(undefined)
};

let phase = "before";
let questionIndex = 0;

// =====================================
// 4. เลือก HTML ที่ต้องใช้
// =====================================

const profileSection = document.getElementById("profile-section");
const questionSection = document.getElementById("question-section");
const resultSection = document.getElementById("result-section");

const questionText = document.getElementById("question-text");
const ratingStars = document.getElementById("rating-stars");
const ratingLabel = document.getElementById("rating-label");

const phaseLabel = document.getElementById("phase-label");
const questionCount = document.getElementById("question-count");
const progressBar = document.getElementById("progress-bar");

const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const skipBtn = document.getElementById("skip-btn");

// =====================================
// 5. เริ่มทำแบบสอบถาม
// =====================================

document.getElementById("start-btn").addEventListener("click", () => {
    const name = document.getElementById("evaluator-name").value.trim();
    const role = document.getElementById("user-role").value;

    if (!name || !role) {
        alert("กรุณากรอกชื่อและเลือกประเภทผู้ใช้งาน");
        return;
    }

    profileSection.hidden = true;
    questionSection.hidden = false;

    renderQuestion();
});

// =====================================
// 6. แสดงคำถามปัจจุบัน
// =====================================

function renderQuestion() {
    const answer = answers[phase][questionIndex];

    
const phaseBadge = document.getElementById("phase-badge");
const phaseIcon = document.getElementById("phase-icon");
const phaseDescription = document.getElementById("phase-description");

if (phase === "before") {
    phaseLabel.textContent = "ช่วงที่ 1 — ก่อนใช้ระบบ IT";
    phaseIcon.textContent = "◷";

    phaseBadge.classList.add("phase-before");
    phaseBadge.classList.remove("phase-after");

    phaseDescription.textContent =
        "ให้นึกถึงวิธีการทำงานเดิม ก่อนนำระบบ IT มาใช้";

} else {
    phaseLabel.textContent = "ช่วงที่ 2 — หลังใช้ระบบ IT";
    phaseIcon.textContent = "✓";

    phaseBadge.classList.add("phase-after");
    phaseBadge.classList.remove("phase-before");

    phaseDescription.textContent =
        "ให้ประเมินจากประสบการณ์การใช้งานระบบ IT ในปัจจุบัน";
}


    questionCount.textContent =
        `ข้อ ${questionIndex + 1}/${questions.length}`;

    questionText.textContent = questions[questionIndex];

    const progress =
        ((questionIndex + 1) / questions.length) * 100;

    progressBar.style.width = `${progress}%`;

    prevBtn.disabled =
        phase === "before" && questionIndex === 0;

    nextBtn.disabled = answer === undefined;

    nextBtn.textContent =
        questionIndex === 9
            ? (phase === "before" ? "ไปประเมินหลังใช้ →" : "ดูผลการประเมิน")
            : "ข้อถัดไป →";

    ratingLabel.textContent =
        answer === undefined
            ? "กรุณาเลือกคะแนน"
            : answer === null
                ? "ไม่สามารถประเมินข้อนี้ได้"
                : `${answer} ดาว — ${ratingLabels[answer]}`;

    createStars();
}

// =====================================
// 7. สร้างดาว 5 ดวง
// =====================================

function createStars() {
    ratingStars.innerHTML = "";

    const currentAnswer = answers[phase][questionIndex];

    for (let value = 1; value <= 5; value++) {
        const star = document.createElement("button");

        star.type = "button";
        star.className = "rating-star";
        star.textContent = "★";
        star.setAttribute("aria-label", `${value} ดาว`);

        if (typeof currentAnswer === "number" && value <= currentAnswer) {
            star.classList.add("active");
        }

        // ชี้ดาวแล้วแสดงสีเหลืองตั้งแต่ดวงแรก
        star.addEventListener("mouseenter", () => {
            paintStars(value);
        });

        star.addEventListener("click", () => {
            answers[phase][questionIndex] = value;
            renderQuestion();
        });

        ratingStars.appendChild(star);
    }

    ratingStars.addEventListener("mouseleave", restoreStars, { once: true });
}

function paintStars(value) {
    const stars = ratingStars.querySelectorAll(".rating-star");

    stars.forEach((star, index) => {
        star.classList.toggle("active", index < value);
    });
}

function restoreStars() {
    const answer = answers[phase][questionIndex];

    paintStars(typeof answer === "number" ? answer : 0);
}

// =====================================
// 8. ไม่สามารถประเมินได้
// =====================================

skipBtn.addEventListener("click", () => {
    answers[phase][questionIndex] = null;
    renderQuestion();
});

// =====================================
// 9. ย้อนกลับ / ถัดไป
// =====================================

prevBtn.addEventListener("click", () => {
    if (questionIndex > 0) {
        questionIndex--;
    } else if (phase === "after") {
        phase = "before";
        questionIndex = 9;
    }

    renderQuestion();
});

nextBtn.addEventListener("click", () => {
    if (questionIndex < 9) {
        questionIndex++;
        renderQuestion();
        return;
    }

    if (phase === "before") {
        phase = "after";
        questionIndex = 0;
        renderQuestion();
        return;
    }

    showResult();
});

// =====================================
// 10. คำนวณผลประเมิน
// =====================================

function calculateAverage(values) {
    const validScores = values.filter(
        value => typeof value === "number"
    );

    if (validScores.length === 0) {
        return null;
    }

    const total = validScores.reduce(
        (sum, value) => sum + value, 0
    );

    return total / validScores.length;
}

function showResult() {
    // เปรียบเทียบเฉพาะข้อที่มีคะแนนทั้งก่อนและหลัง
    const beforeValues = [];
    const afterValues = [];

    for (let i = 0; i < questions.length; i++) {
        const before = answers.before[i];
        const after = answers.after[i];

        if (
            typeof before === "number" &&
            typeof after === "number"
        ) {
            beforeValues.push(before);
            afterValues.push(after);
        }
    }

    const beforeAvg = calculateAverage(beforeValues);
    const afterAvg = calculateAverage(afterValues);

    
    // เก็บผลประเมิน Before–After ชั่วคราว
    const evaluationData = {
        systemId: selectedSystem.id,
        systemName: selectedSystem.name,
        evaluatorName: document.getElementById(
            "evaluator-name"
        ).value.trim(),
        userRole: document.getElementById("user-role").value,

        beforeAnswers: [...answers.before],
        afterAnswers: [...answers.after],

        beforeAverage: beforeAvg,
        afterAverage: afterAvg,
        comparableCount: beforeValues.length
    };

    sessionStorage.setItem(
        "itEvaluationDraft",
        JSON.stringify(evaluationData)
    );

    questionSection.hidden = true;
    resultSection.hidden = false;

    const beforeScore = document.getElementById("before-score");
    const afterScore = document.getElementById("after-score");
    const differenceScore = document.getElementById("difference-score");
    const resultNote = document.getElementById("result-note");

    if (beforeAvg === null || afterAvg === null) {
        beforeScore.textContent = "ไม่มีข้อมูล";
        afterScore.textContent = "ไม่มีข้อมูล";
        differenceScore.textContent = "ยังไม่สามารถเปรียบเทียบได้";
        resultNote.textContent =
            "ไม่มีคำถามที่มีคะแนนครบทั้งก่อนและหลังใช้ระบบ";
        return;
    }

    beforeScore.textContent = `${beforeAvg.toFixed(2)}/5`;
    afterScore.textContent = `${afterAvg.toFixed(2)}/5`;

    const difference = afterAvg - beforeAvg;
    const percentagePoints = (difference / 5) * 100;

    const direction =
        difference > 0 ? "เพิ่มขึ้น" :
        difference < 0 ? "ลดลง" :
        "ไม่เปลี่ยนแปลง";

    differenceScore.textContent =
        `คะแนนเฉลี่ย${direction} ${Math.abs(difference).toFixed(2)} คะแนน`;

    resultNote.textContent =
        `คิดเป็น ${Math.abs(percentagePoints).toFixed(2)} ` +
        `จุดเปอร์เซ็นต์ของคะแนนเต็ม ` +
        `(เปรียบเทียบ ${beforeValues.length} ข้อที่ตอบครบทั้งสองช่วง)`;
}

// =====================================
// 11. ทดลองทำแบบประเมินใหม่
// =====================================

document.getElementById("restart-btn").addEventListener("click", () => {
    answers = {
        before: Array(10).fill(undefined),
        after: Array(10).fill(undefined)
    };

    phase = "before";
    questionIndex = 0;

    resultSection.hidden = true;
    profileSection.hidden = false;
});

document.getElementById("satisfaction-btn").addEventListener("click", () => {
    if (!selectedSystem) return;

    window.location.href =
        `satisfaction.html?system=${encodeURIComponent(selectedSystem.id)}`;
});
