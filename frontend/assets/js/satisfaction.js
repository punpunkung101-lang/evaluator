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
    function updateSystemName() {
        if (!systemNameEl) return;
        if (selectedSystem) {
            const sysName = window.getSystemName ? window.getSystemName(selectedSystem) : selectedSystem.name;
            systemNameEl.textContent = `${sysName} (${selectedSystem.id})`;
        } else {
            systemNameEl.textContent = window.t ? window.t("system_not_found") : "ไม่พบระบบ IT";
        }
    }
    updateSystemName();

    function getQuestions() {
        const defaultQuestions = [
            "ความสะดวกในการเข้าใช้งานและการดำเนินงานผ่านระบบ",
            "ความรวดเร็วในการประมวลผลและการตอบสนองของระบบ",
            "ความถูกต้องและความน่าเชื่อถือของข้อมูลและผลลัพธ์",
            "ความชัดเจนของหน้าจอ เมนูคำสั่ง และคู่มือการใช้งาน",
            "ความพึงพอใจต่อภาพรวมของการใช้งานระบบ IT นี้"
        ];
        if (!window.t) return defaultQuestions;
        return Array.from({ length: 5 }, (_, i) => window.t(`sat_q${i + 1}`));
    }

    function getRatingLabels() {
        const defaultLabels = ["", "น้อยที่สุด", "น้อย", "ปานกลาง", "มาก", "มากที่สุด"];
        if (!window.t) return defaultLabels;
        return ["", window.t("sat_level_1"), window.t("sat_level_2"), window.t("sat_level_3"), window.t("sat_level_4"), window.t("sat_level_5")];
    }

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
        const questions = getQuestions();
        const labels = getRatingLabels();

        if (questionText) {
            questionText.textContent = questions[currentIndex];
        }

        const questionNumber = document.getElementById("question-number");
        if (questionNumber) {
            questionNumber.textContent = window.t
                ? window.t("question_counter", { current: currentIndex + 1, total: questions.length })
                : `ข้อที่ ${currentIndex + 1} / ${questions.length}`;
        }

        const progressBar = document.getElementById("progress-bar");
        if (progressBar) {
            progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
        }

        if (ratingLabel) {
            if (score === null) {
                ratingLabel.textContent = window.t ? window.t("sat_prompt") : "โปรดเลือกระดับความพึงพอใจ";
            } else {
                ratingLabel.textContent = window.t
                    ? window.t("sat_rating_label", { score, label: labels[score] })
                    : `${score} คะแนน — ระดับ${labels[score]}`;
            }
        }

        if (prevBtn) {
            prevBtn.disabled = currentIndex === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = score === null;
        }

        if (nextBtnText) {
            if (currentIndex === 4) {
                nextBtnText.textContent = window.t ? window.t("btn_to_feedback") : "ไปยังข้อเสนอแนะเพิ่มเติม";
            } else {
                nextBtnText.textContent = window.t ? window.t("next") : "ข้อถัดไป";
            }
        }

        renderStars(labels);
    }

    function renderStars(labels) {
        if (!ratingStars) return;
        ratingStars.innerHTML = "";

        const score = answers[currentIndex];
        const ratingLevels = labels || getRatingLabels();

        for (let value = 1; value <= 5; value++) {
            const star = document.createElement("button");

            star.type = "button";
            star.className = "rating-star";
            star.innerHTML = SVG_STAR;
            const ariaLabelText = window.t
                ? window.t("sat_rating_label", { score: value, label: ratingLevels[value] })
                : `ระดับคะแนน ${value} (${ratingLevels[value]})`;
            star.setAttribute("aria-label", ariaLabelText);

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
            const questions = getQuestions();
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

    function updateCharCount() {
        if (feedback && charCount) {
            const len = feedback.value.length;
            charCount.textContent = window.t
                ? window.t("char_counter", { count: len })
                : `${len} / 250 ตัวอักษร`;
        }
    }

    if (feedback) {
        feedback.addEventListener("input", updateCharCount);
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
                alert(window.t ? window.t("alert_no_draft") : "ไม่พบข้อมูลการประเมินเบื้องต้น กรุณาเริ่มทำแบบประเมินใหม่อีกครั้ง");
                window.location.href = "index.html";
                return;
            }

            const evaluationData = JSON.parse(savedDraft);

            if (evaluationData.systemId !== systemId) {
                alert(window.t ? window.t("alert_id_mismatch") : "ข้อมูลรหัสระบบไม่สอดคล้องกัน กรุณาเริ่มทำแบบประเมินใหม่อีกครั้ง");
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
                resultMsg.textContent = window.t ? window.t("sat_success_msg") : "ระบบได้บันทึกผลการประเมินประสิทธิภาพและความพึงพอใจเรียบร้อยแล้ว";
            }
        });
    }

    // Dynamic Language Switch Listener
    document.addEventListener("langchange", () => {
        updateSystemName();
        renderQuestion();
        updateCharCount();
    });

    // เริ่มแสดงคำถามข้อแรก
    renderQuestion();
});
