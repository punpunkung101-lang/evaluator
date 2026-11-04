/**
 * IT Evaluator - Evaluation Form Logic (User Module)
 * Faculty of Allied Health Sciences, Naresuan University
 * Stepped 2-Phase Before-After Assessment
 */

document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // 1. ค้นหาระบบ IT ที่ผู้ใช้เลือก
    // =====================================

    const params = new URLSearchParams(window.location.search);
    const systemId = params.get("system");
    if (new URLSearchParams(window.location.search).get("mode") !== "before-after") {
        window.location.replace(`satisfaction.html${window.location.search}`);
        return;
    }


    let selectedSystem = null;
    const sysList = window.AssessmentCatalog ? window.AssessmentCatalog.getSystems() : (window.systems || []);
    selectedSystem = sysList.find(system => system.id === systemId);

    const systemName = document.getElementById("system-name");

    function updateSystemBadge() {
        if (!systemName) return;
        if (selectedSystem) {
            const sysName = window.getSystemName ? window.getSystemName(selectedSystem) : selectedSystem.name;
            systemName.textContent = `${sysName} (${selectedSystem.id})`;
        } else {
            systemName.textContent = window.t ? window.t("system_not_found") : "ไม่พบระบบ IT ที่เลือก";
            const startBtn = document.getElementById("start-btn");
            if (startBtn) startBtn.disabled = true;
        }
    }
    updateSystemBadge();

    // =====================================
    // 2. คำถามประเมิน 10 ข้อ & ตัวช่วยภาษา
    // =====================================

    function getQuestions() {
        const defaultQuestions = [
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
        if (!window.t) return defaultQuestions;
        return Array.from({ length: 10 }, (_, i) => window.t(`eval_q${i + 1}`));
    }

    function getRatingLabels() {
        const defaultLabels = ["", "น้อยที่สุด", "น้อย", "ปานกลาง", "มาก", "มากที่สุด"];
        if (!window.t) return defaultLabels;
        return ["", window.t("rating_scale_1"), window.t("rating_scale_2"), window.t("rating_scale_3"), window.t("rating_scale_4"), window.t("rating_scale_5")];
    }

    // SVG Icon Helpers
    const SVG_STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
    const SVG_CLOCK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`;
    const SVG_CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

    // =====================================
    // 3. เก็บคำตอบก่อนและหลังใช้ระบบ
    // =====================================

    const progressKey = `itEvaluationProgress:${systemId}`;
    const progress = JSON.parse(sessionStorage.getItem(progressKey) || "null");
    const evaluationId = progress?.id || `eval_${crypto.randomUUID?.() || Date.now() + "_" + Math.random().toString(36).slice(2)}`;
    const answers = {
        before: progress?.before.map(value => value === "unanswered" ? undefined : value) || Array(10).fill(undefined),
        after: progress?.after.map(value => value === "unanswered" ? undefined : value) || Array(10).fill(undefined)
    };
    let phase = progress?.phase || "before";
    let questionIndex = progress?.questionIndex || 0;
    let leaving = false;
    window.addEventListener("beforeunload", event => {
        if (leaving || !answers.before.concat(answers.after).some(value => value !== undefined)) return;
        event.preventDefault();
        event.returnValue = "";
    });

    // =====================================
    // 4. เลือก HTML ที่ต้องใช้
    // =====================================

    const profileSection = document.getElementById("profile-section");
    const questionSection = document.getElementById("question-section");

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
    // 5. ปุ่มเริ่มต้นการประเมิน
    // =====================================

    const startBtn = document.getElementById("start-btn");
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            const evaluatorName = document.getElementById("evaluator-name").value.trim();
            const userRole = document.getElementById("user-role").value;

            if (!userRole) {
                alert(window.t ? window.t("evaluator_role_required") : "กรุณาเลือกประเภทผู้ใช้งาน");
                return;
            }

            const defaultName = window.t ? window.t("anonymous_evaluator") : "ผู้ใช้งานไม่ประสงค์ออกนาม";
            sessionStorage.setItem("evaluatorProfile", JSON.stringify({
                name: evaluatorName || defaultName,
                role: userRole
            }));

            profileSection.hidden = true;
            questionSection.hidden = false;

            renderQuestion();
        });
    }

    // Auto-start if evaluator profile already submitted from index.html
    const existingProfile = sessionStorage.getItem("evaluatorProfile");
    if (existingProfile && selectedSystem) {
        if (profileSection) profileSection.hidden = true;
        if (questionSection) questionSection.hidden = false;
        renderQuestion();
    }

    // =====================================
    // 6. ฟังก์ชันแสดงคำถาม
    // =====================================

    function renderQuestion() {
        const serialize = values => values.map(value => value === undefined ? "unanswered" : value);
        sessionStorage.setItem(progressKey, JSON.stringify({
            id: evaluationId, phase, questionIndex,
            before: serialize(answers.before), after: serialize(answers.after)
        }));
        const isBefore = phase === "before";
        const currentQuestions = getQuestions();
        const currentLabels = getRatingLabels();

        if (phaseBadge) {
            phaseBadge.className = isBefore ? "phase-badge phase-before" : "phase-badge phase-after";
        }
        if (phaseIcon) {
            phaseIcon.innerHTML = isBefore ? SVG_CLOCK : SVG_CHECK;
        }
        if (phaseLabel) {
            phaseLabel.textContent = isBefore
                ? (window.t ? window.t("phase_1_label") : "ช่วงที่ 1: ก่อนการนำระบบ IT มาใช้ (การปฏิบัติงานเดิม)")
                : (window.t ? window.t("phase_2_label") : "ช่วงที่ 2: หลังการนำระบบ IT มาใช้ (ปัจจุบัน)");
        }
        if (phaseDescription) {
            phaseDescription.textContent = isBefore
                ? (window.t ? window.t("phase_1_desc") : "โปรดพิจารณาการปฏิบัติงานตามวิธีการทำงานเดิม ก่อนเริ่มนำระบบ IT เข้ามาใช้งาน")
                : (window.t ? window.t("phase_2_desc") : "โปรดพิจารณาความสะดวก รวดเร็ว และประสิทธิภาพในการปฏิบัติงานจริงผ่านระบบ IT นี้");
        }

        const currentStep = (isBefore ? 0 : 10) + (questionIndex + 1);
        if (questionCount) {
            questionCount.textContent = window.t
                ? window.t("question_counter", { current: questionIndex + 1, total: currentQuestions.length })
                : `ข้อที่ ${questionIndex + 1} / ${currentQuestions.length}`;
        }
        if (progressBar) {
            progressBar.style.width = `${(currentStep / 20) * 100}%`;
        }

        if (questionText) {
            questionText.textContent = currentQuestions[questionIndex];
        }

        renderStars(currentLabels);

        const currentAnswer = answers[phase][questionIndex];
        if (ratingLabel) {
            if (currentAnswer === undefined) {
                ratingLabel.textContent = window.t ? window.t("rating_prompt") : "โปรดเลือกระดับความคิดเห็น";
            } else if (currentAnswer === null) {
                ratingLabel.textContent = window.t ? window.t("rating_skipped") : "ระบุ: ไม่สามารถประเมินได้ (ข้ามข้อนี้)";
            } else {
                ratingLabel.textContent = window.t
                    ? window.t("rating_point_label", { score: currentAnswer, label: currentLabels[currentAnswer] })
                    : `${currentAnswer} คะแนน — ${currentLabels[currentAnswer]}`;
            }
        }

        if (prevBtn) {
            prevBtn.disabled = (phase === "before" && questionIndex === 0);
        }
        if (nextBtn) {
            nextBtn.disabled = (currentAnswer === undefined);
        }

        if (nextBtnText) {
            if (phase === "before" && questionIndex === currentQuestions.length - 1) {
                nextBtnText.textContent = window.t ? window.t("btn_to_phase_2") : "ไปยังช่วงที่ 2 (หลังใช้ระบบ IT)";
            } else if (phase === "after" && questionIndex === currentQuestions.length - 1) {
                nextBtnText.textContent = document.documentElement.lang === "en" ? "Continue to satisfaction survey" : "ไปยังแบบประเมินความพึงพอใจ";
            } else {
                nextBtnText.textContent = window.t ? window.t("next") : "ข้อถัดไป";
            }
        }
    }

    // =====================================
    // 6.5 Advance helper with double-click guard
    // =====================================

    let _isAdvancing = false;
    let _lastSelectionTime = 0;
    let _starWasSelectedBeforeGesture = false;
    let _repeatStar = null;
    let _repeatClicks = 0;

    function advanceToNext() {
        if (_isAdvancing) return;
        const currentAnswer = answers[phase][questionIndex];
        // Must have an answered rating (1-5) or skipped (null)
        if (currentAnswer === undefined) return;
        if (nextBtn && nextBtn.disabled) return;
        _isAdvancing = true;
        _repeatStar = null;
        _repeatClicks = 0;

        const currentQuestions = getQuestions();
        if (questionIndex < currentQuestions.length - 1) {
            questionIndex++;
            renderQuestion();
        } else if (phase === "before") {
            phase = "after";
            questionIndex = 0;
            renderQuestion();
        } else {
            continueToSatisfaction();
        }
        setTimeout(() => {
            _isAdvancing = false;
        }, 350);
    }

    // =====================================
    // 7. ฟังก์ชันแสดงดาว (Star Rating with Double-Click)
    // =====================================

    function renderStars(currentLabels) {
        if (!ratingStars) return;

        const labels = currentLabels || getRatingLabels();
        const currentAnswer = answers[phase][questionIndex];
        const existingStars = ratingStars.querySelectorAll(".rating-star");

        if (existingStars.length === 5) {
            existingStars.forEach((star, idx) => {
                const score = idx + 1;
                const ariaLabelText = window.t
                    ? window.t("rating_point_label", { score, label: labels[score] })
                    : `ระดับความคิดเห็น ${score} (${labels[score]})`;
                star.setAttribute("aria-label", ariaLabelText);
                star.classList.toggle("active", typeof currentAnswer === "number" && score <= currentAnswer);
            });
            return;
        }

        ratingStars.innerHTML = "";

        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("button");
            star.type = "button";
            star.className = "rating-star";
            star.innerHTML = SVG_STAR;
            const ariaLabelText = window.t
                ? window.t("rating_point_label", { score: i, label: labels[i] })
                : `ระดับความคิดเห็น ${i} (${labels[i]})`;
            star.setAttribute("aria-label", ariaLabelText);

            if (typeof currentAnswer === "number" && i <= currentAnswer) {
                star.classList.add("active");
            }

            star.addEventListener("mouseenter", () => paintStars(i));

            star.addEventListener("click", (e) => {
                if (_isAdvancing) return;
                const prevAnswer = answers[phase][questionIndex];
                const wasAlreadySelected = (typeof prevAnswer === "number" && prevAnswer === i);

                if (e.detail <= 1) {
                    _starWasSelectedBeforeGesture = wasAlreadySelected;
                }

                if (!wasAlreadySelected) {
                    answers[phase][questionIndex] = i;
                    _lastSelectionTime = Date.now();
                    _repeatStar = i;
                    _repeatClicks = 1;
                    renderQuestion();
                } else {
                    _repeatClicks = _repeatStar === i ? _repeatClicks + 1 : 1;
                    _repeatStar = i;
                    if (e.detail === 2 && (_starWasSelectedBeforeGesture || Date.now() - _lastSelectionTime >= 300)) {
                        advanceToNext();
                    } else if (_repeatClicks >= 3) {
                        advanceToNext();
                    }
                }
            });

            star.addEventListener("dblclick", (e) => {
                e.preventDefault();
                const cur = answers[phase][questionIndex];
                if (typeof cur !== "number" || cur !== i) {
                    return;
                }
                if (!_starWasSelectedBeforeGesture && Date.now() - _lastSelectionTime < 300) {
                    return;
                }
                advanceToNext();
            });

            ratingStars.appendChild(star);
        }

        ratingStars.onmouseleave = () => {
            const current = answers[phase][questionIndex];
            paintStars(typeof current === "number" ? current : 0);
        };
    }

    function paintStars(value) {
        if (!ratingStars) return;
        const stars = ratingStars.querySelectorAll(".rating-star");
        stars.forEach((star, index) => {
            star.classList.toggle("active", index < value);
        });
    }

    // =====================================
    // 8. ปุ่มข้ามคำถาม
    // =====================================

    if (skipBtn) {
        skipBtn.addEventListener("click", () => {
            answers[phase][questionIndex] = null;
            renderQuestion();
        });
    }

    // =====================================
    // 9. ปุ่มถัดไป และ ย้อนกลับ
    // =====================================

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            advanceToNext();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            const currentQuestions = getQuestions();
            if (questionIndex > 0) {
                questionIndex--;
                renderQuestion();
            } else if (phase === "after") {
                phase = "before";
                questionIndex = currentQuestions.length - 1;
                renderQuestion();
            }
        });
    }

    // =====================================
    // 10. ฟังก์ชันคำนวณและแสดงผลสรุป
    // =====================================

    function continueToSatisfaction() {
        const currentQuestions = getQuestions();
        const beforeValues = [];
        const afterValues = [];

        for (let i = 0; i < currentQuestions.length; i++) {
            const before = answers.before[i];
            const after = answers.after[i];

            if (typeof before === "number" && typeof after === "number") {
                beforeValues.push(before);
                afterValues.push(after);
            }
        }

        const calcAvg = values =>
            values.length === 0
                ? null
                : values.reduce((sum, v) => sum + v, 0) / values.length;

        const beforeAvg = calcAvg(beforeValues);
        const afterAvg = calcAvg(afterValues);

        const profileRaw = sessionStorage.getItem("evaluatorProfile");
        const defaultRole = "staff";
        const defaultName = window.t ? window.t("anonymous_evaluator") : "ผู้ประเมิน";
        const profile = profileRaw ? JSON.parse(profileRaw) : { name: defaultName, role: defaultRole };

        const evaluationData = {
            id: evaluationId,
            evaluatorId: profile.id || profile.username || "",
            systemId: selectedSystem ? selectedSystem.id : (systemId || "UNKNOWN"),
            systemName: selectedSystem ? (window.getSystemName ? window.getSystemName(selectedSystem) : selectedSystem.name) : "",
            evaluatorName: profile.name,
            userRole: profile.role,
            beforeAnswers: [...answers.before],
            afterAnswers: [...answers.after],
            beforeAverage: beforeAvg,
            afterAverage: afterAvg,
            comparableCount: beforeValues.length
        };

        sessionStorage.setItem(`itEvaluationDraft:${evaluationId}`, JSON.stringify(evaluationData));

        leaving = true;
        window.location.href = `satisfaction.html?system=${encodeURIComponent(evaluationData.systemId)}&assessment=${encodeURIComponent(evaluationId)}`;
    }

    document.addEventListener("langchange", () => {
        document.getElementById("survey-part").textContent = document.documentElement.lang === "en" ? "Part 1/2 — Efficiency and effectiveness" : "ส่วนที่ 1/2 — ประสิทธิภาพและประสิทธิผล";
        updateSystemBadge();
        if (questionSection && !questionSection.hidden) renderQuestion();
    });
});
