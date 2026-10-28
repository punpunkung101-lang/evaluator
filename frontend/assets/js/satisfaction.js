
// อ่านรหัสระบบจาก URL
const params = new URLSearchParams(window.location.search);
const systemId = params.get("system");

// ค้นหาชื่อระบบ
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

document.getElementById("system-name").textContent =
    selectedSystem ? selectedSystem.name : "ไม่พบระบบ IT";

// คำถามความพึงพอใจ 5 ข้อ
const questions = [
    "คุณพึงพอใจต่อความสะดวกในการใช้งานระบบเพียงใด?",
    "คุณพึงพอใจต่อความรวดเร็วในการทำงานของระบบเพียงใด?",
    "คุณพึงพอใจต่อความถูกต้องของข้อมูลและผลลัพธ์เพียงใด?",
    "คุณพึงพอใจต่อความชัดเจนของหน้าจอและเมนูเพียงใด?",
    "โดยรวมแล้ว คุณพึงพอใจต่อระบบ IT นี้เพียงใด?"
];

const labels = [
    "",
    "น้อยที่สุด",
    "น้อย",
    "ปานกลาง",
    "มาก",
    "มากที่สุด"
];

let answers = Array(5).fill(null);
let currentIndex = 0;

const questionText = document.getElementById("question-text");
const ratingStars = document.getElementById("rating-stars");
const ratingLabel = document.getElementById("rating-label");

const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

function renderQuestion() {
    const score = answers[currentIndex];

    questionText.textContent = questions[currentIndex];

    document.getElementById("question-number").textContent =
        `ข้อ ${currentIndex + 1}/5`;

    document.getElementById("progress-bar").style.width =
        `${((currentIndex + 1) / questions.length) * 100}%`;

    ratingLabel.textContent = score === null
        ? "กรุณาเลือกคะแนน"
        : `${score} ดาว — ${labels[score]}`;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = score === null;

    nextBtn.textContent = currentIndex === 4
        ? "ไปข้อเสนอแนะ →"
        : "ข้อถัดไป →";

    renderStars();
}

function renderStars() {
    ratingStars.innerHTML = "";

    const score = answers[currentIndex];

    for (let value = 1; value <= 5; value++) {
        const star = document.createElement("button");

        star.type = "button";
        star.className = "rating-star";
        star.textContent = "★";
        star.setAttribute("aria-label", `${value} ดาว`);

        if (score !== null && value <= score) {
            star.classList.add("active");
        }

        star.addEventListener("mouseenter", () => {
            paintStars(value);
        });

        star.addEventListener("click", () => {
            answers[currentIndex] = value;
            renderQuestion();
        });

        ratingStars.appendChild(star);
    }

    ratingStars.onmouseleave = () => {
        paintStars(answers[currentIndex] || 0);
    };
}

function paintStars(value) {
    const stars = ratingStars.querySelectorAll(".rating-star");

    stars.forEach((star, index) => {
        star.classList.toggle("active", index < value);
    });
}

prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
    }
});

nextBtn.addEventListener("click", () => {
    if (currentIndex < questions.length - 1) {
        currentIndex++;
        renderQuestion();
    } else {
        document.querySelector(".satisfaction-card").hidden = true;
        document.getElementById("feedback-section").hidden = false;
    }
});

// นับจำนวนตัวอักษรในข้อเสนอแนะ
const feedback = document.getElementById("feedback");

feedback.addEventListener("input", () => {
    document.getElementById("char-count").textContent =
        `${feedback.value.length}/250 ตัวอักษร`;
});

// คำนวณคะแนนความพึงพอใจ
document.getElementById("submit-btn").addEventListener("click", () => {
    const total = answers.reduce((sum, score) => sum + score, 0);
    const average = total / answers.length;
    
    // อ่านข้อมูล Before–After ที่เก็บไว้
    const savedDraft = sessionStorage.getItem(
        "itEvaluationDraft"
    );

    if (!savedDraft) {
        alert("ไม่พบข้อมูลการประเมินก่อนหน้า กรุณาเริ่มใหม่");
        return;
    }

    const evaluationData = JSON.parse(savedDraft);

    // ตรวจสอบว่าเป็นระบบ IT เดียวกัน
    if (evaluationData.systemId !== systemId) {
        alert("ข้อมูลระบบ IT ไม่ตรงกัน กรุณาเริ่มใหม่");
        return;
    }

    // รวมคะแนนความพึงพอใจและข้อเสนอแนะ
    evaluationData.satisfactionAnswers = [...answers];
    evaluationData.satisfactionAverage = average;
    evaluationData.feedback = feedback.value.trim();

    // เก็บข้อมูลการประเมินฉบับสมบูรณ์ชั่วคราว
    sessionStorage.setItem(
        "itEvaluationComplete",
        JSON.stringify(evaluationData)
    );


    document.getElementById("feedback-section").hidden = true;
    document.getElementById("result-section").hidden = false;

    document.getElementById("average-score").textContent =
        `${average.toFixed(2)} / 5`;

    document.getElementById("result-message").textContent =
        "นี่คือคะแนนความพึงพอใจเฉลี่ยของคุณ";
});

// เริ่มแสดงคำถามข้อแรก
renderQuestion();
