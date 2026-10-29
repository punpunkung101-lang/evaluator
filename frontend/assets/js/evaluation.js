// =====================================
// 1. ค้นหาระบบ IT ที่ผู้ใช้เลือก
// =====================================

const params = new URLSearchParams(window.location.search);
const systemId = params.get("system");

let selectedSystem = null;

if (typeof categories !== "undefined") {
    for (const category of categories) {
        const found = category.systems.find(
            system => system.id === systemId
        );

        if (found) {
            selectedSystem = found;
            break;
        }
    }
}

const systemName = document.getElementById("system-name");

if (selectedSystem) {
    systemName.textContent = `${selectedSystem.name} (${selectedSystem.id})`;
} else {
    systemName.textContent = "ไม่พบระบบ IT ที่เลือก";
    const startBtn = document.getElementById("start-btn");
    if (startBtn) startBtn.disabled = true;
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

// SVG Icon Helpers
const SVG_STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
const SVG_CLOCK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`;
const SVG_CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

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

const phaseBadge = document.getElementById("phase-badge");
const phaseIcon = document.getElementById("phase-icon");
const phaseLabel = document.getElementById("phase-label");
const phaseDescription = document.getElementById("phase-description");
const questionCount = document.getElementById("question-count");
const progressBar = document.getElementById("progress-bar");

const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const nextBtnText = document.getElementById("next-btn-text");
const skipBtn = document.getElementById("skip-btn");

// =====================================
// 5. เริ่มทำแบบสอบถาม
// =====================================

document.getElementById("start-btn").addEventListener("click", () => {
    const name = document.getElementById("evaluator-name").value.trim();
    const role = document.getElementById("user-role").value;

    if (!name || !role) {
        alert("กรุณากรอกชื่อผู้ประเมินและเลือกประเภทผู้ใช้งาน");
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

    if (phase === "before") {
        phaseLabel.textContent = "ช่วงที่ 1: ก่อนการนำระบบ IT มาใช้";
        phaseIcon.innerHTML = SVG_CLOCK;

        phaseBadge.classList.add("phase-before");
        phaseBadge.classList.remove("phase-after");

        phaseDescription.textContent =
            "โปรดพิจารณาการปฏิบัติงานตามวิธีการทำงานเดิม ก่อนเริ่มนำระบบ IT เข้ามาใช้งาน";
    } else {
        phaseLabel.textContent = "ช่วงที่ 2: หลังการนำระบบ IT มาใช้";
        phaseIcon.innerHTML = SVG_CHECK;

        phaseBadge.classList.add("phase-after");
        phaseBadge.classList.remove("phase-before");

        phaseDescription.textContent =
            "โปรดพิจารณาจากประสบการณ์การใช้งานจริงของระบบ IT ในปัจจุบัน";
    }

    questionCount.textContent = `ข้อที่ ${questionIndex + 1} / ${questions.length}`;
    questionText.textContent = questions[questionIndex];

    const progress = ((questionIndex + 1) / questions.length) * 100;
    progressBar.style.width = `${progress}%`;

    prevBtn.disabled = phase === "before" && questionIndex === 0;
    nextBtn.disabled = answer === undefined;

    if (questionIndex === 9) {
        if (nextBtnText) {
            nextBtnText.textContent = phase === "before" ? "ดำเนินการช่วงถัดไป" : "ดูสรุปผลการประเมิน";
        }
    } else {
        if (nextBtnText) {
            nextBtnText.textContent = "ข้อถัดไป";
        }
    }

    ratingLabel.textContent =
        answer === undefined
            ? "โปรดเลือกระดับความคิดเห็น"
            : answer === null
                ? "ไม่สามารถประเมินข้อนี้ได้ (ข้ามคำถาม)"
                : `${answer} คะแนน — ระดับ${ratingLabels[answer]}`;

    createStars();
}

// =====================================
// 7. สร้างปุ่มดาว 5 ระดับ
// =====================================

function createStars() {
    ratingStars.innerHTML = "";

    const currentAnswer = answers[phase][questionIndex];

    for (let value = 1; value <= 5; value++) {
        const star = document.createElement("button");

        star.type = "button";
        star.className = "rating-star";
        star.innerHTML = SVG_STAR;
        star.setAttribute("aria-label", `ระดับคะแนน ${value} (${ratingLabels[value]})`);

        if (typeof currentAnswer === "number" && value <= currentAnswer) {
            star.classList.add("active");
        }

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
    if (typeof answer === "number") {
        paintStars(answer);
    } else {
        paintStars(0);
    }
}

// =====================================
// 8. ข้ามคำถามข้อนี้
// =====================================

skipBtn.addEventListener("click", () => {
    answers[phase][questionIndex] = null;
    renderQuestion();
});

// =====================================
// 9. ปุ่มย้อนกลับและข้อถัดไป
// =====================================

prevBtn.addEventListener("click", () => {
    if (questionIndex > 0) {
        questionIndex--;
        renderQuestion();
    } else if (phase === "after") {
        phase = "before";
        questionIndex = 9;
        renderQuestion();
    }
});

nextBtn.addEventListener("click", () => {
    if (questionIndex < 9) {
        questionIndex++;
        renderQuestion();
    } else if (phase === "before") {
        phase = "after";
        questionIndex = 0;
        renderQuestion();
    } else {
        showResults();
    }
});

// =====================================
// 10. คำนวณคะแนนเฉลี่ย
// =====================================

function calculateAverage(values) {
    const validValues = values.filter(v => typeof v === "number" && !isNaN(v));
    if (validValues.length === 0) return null;
    return validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
}

function showResults() {
    const beforeValues = [];
    const afterValues = [];

    for (let i = 0; i < 10; i++) {
        const b = answers.before[i];
        const a = answers.after[i];

        if (typeof b === "number" && typeof a === "number") {
            beforeValues.push(b);
            afterValues.push(a);
        }
    }

    const beforeAvg = calculateAverage(beforeValues);
    const afterAvg = calculateAverage(afterValues);

    const evaluationData = {
        systemId: selectedSystem.id,
        systemName: selectedSystem.name,
        evaluatorName: document.getElementById("evaluator-name").value.trim(),
        userRole: document.getElementById("user-role").value,
        beforeAnswers: [...answers.before],
        afterAnswers: [...answers.after],
        beforeAverage: beforeAvg,
        afterAverage: afterAvg,
        comparableCount: beforeValues.length
    };

    sessionStorage.setItem("itEvaluationDraft", JSON.stringify(evaluationData));

    questionSection.hidden = true;
    resultSection.hidden = false;

    const beforeScore = document.getElementById("before-score");
    const afterScore = document.getElementById("after-score");
    const differenceScore = document.getElementById("difference-score");
    const resultNote = document.getElementById("result-note");

    if (beforeAvg === null || afterAvg === null) {
        beforeScore.textContent = "ไม่มีข้อมูล";
        afterScore.textContent = "ไม่มีข้อมูล";
        differenceScore.textContent = "ไม่สามารถเปรียบเทียบได้";
        resultNote.textContent = "ไม่มีข้อคำถามที่ได้รับการประเมินครบทั้งช่วงก่อนและหลังการใช้งาน";
        return;
    }

    beforeScore.textContent = `${beforeAvg.toFixed(2)} / 5`;
    afterScore.textContent = `${afterAvg.toFixed(2)} / 5`;

    const difference = afterAvg - beforeAvg;
    const percentagePoints = (difference / 5) * 100;

    const direction =
        difference > 0 ? "เพิ่มขึ้น" :
        difference < 0 ? "ลดลง" :
        "คงที่";

    differenceScore.textContent = `คะแนนเฉลี่ย${direction} ${Math.abs(difference).toFixed(2)} คะแนน`;
    resultNote.textContent =
        `คิดเป็นผลต่าง ${Math.abs(percentagePoints).toFixed(2)} จุดเปอร์เซ็นต์ (คำนวณจาก ${beforeValues.length} ข้อคำถามที่ตอบครบทั้งสองช่วง)`;
}

// =====================================
// 11. รีสตาร์ท หรือ ไปประเมินความพึงพอใจ
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
    window.location.href = `satisfaction.html?system=${encodeURIComponent(selectedSystem.id)}`;
});
