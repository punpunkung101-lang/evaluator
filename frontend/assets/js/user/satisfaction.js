/**
 * IT Evaluator - Satisfaction Assessment Logic (User Module)
 * Faculty of Allied Health Sciences, Naresuan University
 */

document.addEventListener("DOMContentLoaded", () => {

    // อ่านรหัสระบบจาก URL
    const params = new URLSearchParams(window.location.search);
    const systemId = params.get("system");

    // ค้นหาชื่อระบบ
    let selectedSystem = null;
    const categoryList = typeof categories !== "undefined" ? categories : (window.categories || []);

    for (const category of categoryList) {
        const found = (category.systems || []).find(system => system.id === systemId);
        if (found) {
            selectedSystem = found;
            break;
        }
    }

    const systemNameEl = document.getElementById("system-name");
    if (systemNameEl) {
        systemNameEl.textContent = selectedSystem
            ? `${selectedSystem.name} (${selectedSystem.id})`
            : "ไม่พบระบบ IT";
    }

    // คำถามความพึงพอใจ 5 ข้อ
    const questions = [
        "ความสะดวกในการเข้าใช้งานและการดำเนินงานผ่านระบบ",
        "ความรวดเร็วในการประมวลผลและการตอบสนองของระบบ",
        "ความถูกต้องและความน่าเชื่อถือของข้อมูลและผลลัพธ์",
        "ความชัดเจนของหน้าจอ เมนูคำสั่ง และคู่มือการใช้งาน",
        "ความพึงพอใจต่อภาพรวมของการใช้งานระบบ IT นี้"
    ];

    const labels = [
        "",
        "น้อยที่สุด",
        "น้อย",
        "ปานกลาง",
        "มาก",
        "มากที่สุด"
    ];

    const SVG_STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;

    let answers = Array(5).fill(null);
    let currentIndex = 0;

    const questionText = document.getElementById("question-text");
    const ratingStars = document.getElementById("rating-stars");
    const ratingLabel = document.getElementById("rating-label");

    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const nextBtnText = document.getElementById("next-btn-text");

    function renderQuestion() {
        const score = answers[currentIndex];

        if (questionText) {
            questionText.textContent = questions[currentIndex];
        }

        const questionNumber = document.getElementById("question-number");
        if (questionNumber) {
            questionNumber.textContent = `ข้อที่ ${currentIndex + 1} / ${questions.length}`;
        }

        const progressBar = document.getElementById("progress-bar");
        if (progressBar) {
            progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
        }

        if (ratingLabel) {
            ratingLabel.textContent = score === null
                ? "โปรดเลือกระดับความพึงพอใจ"
                : `${score} คะแนน — ระดับ${labels[score]}`;
        }

        if (prevBtn) {
            prevBtn.disabled = currentIndex === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = score === null;
        }

        if (nextBtnText) {
            nextBtnText.textContent = currentIndex === 4
                ? "ไปยังข้อเสนอแนะเพิ่มเติม"
                : "ข้อถัดไป";
        }

        renderStars();
    }

    function renderStars() {
        if (!ratingStars) return;
        ratingStars.innerHTML = "";

        const score = answers[currentIndex];

        for (let value = 1; value <= 5; value++) {
            const star = document.createElement("button");

            star.type = "button";
            star.className = "rating-star";
            star.innerHTML = SVG_STAR;
            star.setAttribute("aria-label", `ระดับคะแนน ${value} (${labels[value]})`);

            if (score !== null && value <= score) {
                star.classList.add("active");
            }

            star.addEventListener("mouseenter", () => paintStars(value));
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
        if (!ratingStars) return;
        const stars = ratingStars.querySelectorAll(".rating-star");
        stars.forEach((star, index) => {
            star.classList.toggle("active", index < value);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentIndex > 0) {
                currentIndex--;
                renderQuestion();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (currentIndex < questions.length - 1) {
                currentIndex++;
                renderQuestion();
            } else {
                const card = document.querySelector(".satisfaction-card");
                if (card) card.hidden = true;
                const feedbackSection = document.getElementById("feedback-section");
                if (feedbackSection) feedbackSection.hidden = false;
            }
        });
    }

    // นับจำนวนตัวอักษรในข้อเสนอแนะ
    const feedback = document.getElementById("feedback");
    const charCount = document.getElementById("char-count");

    if (feedback && charCount) {
        feedback.addEventListener("input", () => {
            charCount.textContent = `${feedback.value.length} / 250 ตัวอักษร`;
        });
    }

    // บันทึกและคำนวณคะแนนความพึงพอใจ
    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) {
        submitBtn.addEventListener("click", () => {
            const total = answers.reduce((sum, score) => sum + (score || 0), 0);
            const average = total / answers.length;

            // อ่านข้อมูล Before–After ที่เก็บไว้ใน sessionStorage
            const savedDraft = sessionStorage.getItem("itEvaluationDraft");

            if (!savedDraft) {
                alert("ไม่พบข้อมูลการประเมินเบื้องต้น กรุณาเริ่มทำแบบประเมินใหม่อีกครั้ง");
                window.location.href = "index.html";
                return;
            }

            const evaluationData = JSON.parse(savedDraft);

            if (evaluationData.systemId !== systemId) {
                alert("ข้อมูลรหัสระบบไม่สอดคล้องกัน กรุณาเริ่มทำแบบประเมินใหม่อีกครั้ง");
                window.location.href = "index.html";
                return;
            }

            // รวมคะแนนความพึงพอใจและข้อเสนอแนะ
            evaluationData.satisfactionAnswers = [...answers];
            evaluationData.satisfactionAverage = average;
            evaluationData.feedback = feedback ? feedback.value.trim() : "";

            // เก็บข้อมูลลงใน sessionStorage
            sessionStorage.setItem("itEvaluationComplete", JSON.stringify(evaluationData));

            // บันทึกผ่าน EvaluationAPI เพื่อส่งต่อไปยัง Backend/Supabase หรือ Local Storage ถาวร
            if (typeof EvaluationAPI !== "undefined") {
                EvaluationAPI.submitEvaluation(evaluationData);
            }

            const feedbackSection = document.getElementById("feedback-section");
            if (feedbackSection) feedbackSection.hidden = true;

            const resultSection = document.getElementById("result-section");
            if (resultSection) resultSection.hidden = false;

            const avgScoreEl = document.getElementById("average-score");
            if (avgScoreEl) avgScoreEl.textContent = `${average.toFixed(2)} / 5`;

            const resultMsg = document.getElementById("result-message");
            if (resultMsg) {
                resultMsg.textContent = "ระบบได้บันทึกผลการประเมินประสิทธิภาพและความพึงพอใจเรียบร้อยแล้ว";
            }
        });
    }

    // เริ่มแสดงคำถามข้อแรก
    renderQuestion();
});
