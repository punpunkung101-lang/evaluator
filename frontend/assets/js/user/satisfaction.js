/**
 * IT Evaluator - Satisfaction Assessment Logic (User Module)
 * Faculty of Allied Health Sciences, Naresuan University
 */

function getSatisfactionSubmissionFailureReason(error) {
    if (error?.status === 401) return "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง";

    const message = String(error?.message || "");
    if (/(ไม่สามารถเชื่อมต่อ C\+\+ Backend|Failed to fetch|NetworkError|ERR_CONNECTION_REFUSED|ECONNREFUSED|Load failed)/i.test(message)) {
        const baseUrl = window.API_CONFIG?.backendBaseUrl || window.EvaluatorAPIBaseUrl || "http://127.0.0.1:8080";
        return `ไม่สามารถเชื่อมต่อ backend ที่ ${baseUrl} ได้ กรุณาเริ่ม backend จาก repository root`;
    }

    return error?.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
}

document.addEventListener("DOMContentLoaded", async () => {

    // อ่านรหัสระบบจาก URL
    const params = new URLSearchParams(window.location.search);
    const systemId = params.get("system");
    const requestedId = params.get("assessment");

    // ค้นหาชื่อระบบ
    let selectedSystem = null;
    const sysList = window.AssessmentCatalog ? window.AssessmentCatalog.getSystems() : (window.systems || []);
    selectedSystem = sysList.find(system => system.id === systemId);

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

    if (selectedSystem && !requestedId) {
        try {
            const effectivenessQuestions = await window.EvaluationAPI.getQuestions(systemId, "effectiveness");
            if (effectivenessQuestions.some(question => question.active !== false)) {
                window.location.replace(`evaluation.html?mode=before-after&system=${encodeURIComponent(systemId)}`);
                return;
            }
        } catch (error) {
            const errorBox = document.getElementById("submit-error");
            if (errorBox) errorBox.textContent = `ตรวจสอบคำถามประสิทธิผลจากฐานข้อมูลไม่สำเร็จ: ${error.message}`;
            return;
        }
    }

    let questions = [];
    if (selectedSystem) {
        try {
            questions = await window.EvaluationAPI.getQuestions(systemId, "satisfaction");
            questions = questions.filter(question => question.active !== false).sort((a, b) => a.order - b.order);
        } catch (error) {
            const errorBox = document.getElementById("submit-error");
            if (errorBox) errorBox.textContent = `โหลดคำถามจากฐานข้อมูลไม่สำเร็จ: ${error.message}`;
            return;
        }
    }
    function questionTextFor(question) {
        return document.documentElement.lang === "en" ? question.text_en || question.text : question.text;
    }

    function getRatingLabels() {
        const defaultLabels = ["", "น้อยที่สุด", "น้อย", "ปานกลาง", "มาก", "มากที่สุด"];
        if (!window.t) return defaultLabels;
        return ["", window.t("sat_level_1"), window.t("sat_level_2"), window.t("sat_level_3"), window.t("sat_level_4"), window.t("sat_level_5")];
    }

    const SVG_STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;

    const draftKey = requestedId ? `itEvaluationDraft:${requestedId}` : "itEvaluationDraft";
    const draft = requestedId ? JSON.parse(sessionStorage.getItem(draftKey) || "null") : null;
    const standaloneKey = `itSatisfactionSession:${systemId}`;
    const assessmentId = requestedId || sessionStorage.getItem(standaloneKey) || `eval_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const completionKey = `itEvaluationComplete:${assessmentId}`;
    const completed = JSON.parse(sessionStorage.getItem(completionKey) || "null");
    const matchingCompletion = completed?.id === assessmentId && completed.systemId === systemId && completed.submittedAt;
    const editUrl = `evaluation.html?mode=before-after&system=${encodeURIComponent(systemId || "")}`;
    if (!selectedSystem || (requestedId && !matchingCompletion && (draft?.id !== requestedId || draft.systemId !== systemId))) {
        window.location.replace(selectedSystem ? editUrl : "index.html");
        return;
    }
    if (!requestedId) sessionStorage.setItem(standaloneKey, assessmentId);
    const progressKey = `itSatisfactionProgress:${assessmentId}`;
    const progress = JSON.parse(sessionStorage.getItem(progressKey) || "null");
    const questionSnapshot = questions.map(({ id, text, text_en }) => ({ id, text, text_en }));
    const sameQuestions = JSON.stringify(progress?.questions) === JSON.stringify(questionSnapshot);
    const answers = sameQuestions ? progress.answers : Array(questions.length).fill(null);
    let currentIndex = sameQuestions ? progress.index : 0;
    let atFeedback = sameQuestions && Boolean(progress.atFeedback);
    let leaving = false;
    let finished = Boolean(matchingCompletion);
    const english = () => document.documentElement.lang === "en";
    const label = (th, en) => english() ? en : th;

    window.addEventListener("beforeunload", event => {
        if (leaving || finished) return;
        event.preventDefault();
        event.returnValue = "";
    });

    const questionText = document.getElementById("question-text");
    const ratingStars = document.getElementById("rating-stars");
    const ratingLabel = document.getElementById("rating-label");

    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const nextBtnText = document.getElementById("next-btn-text");

    function renderQuestion() {
        const score = answers[currentIndex];
        const labels = getRatingLabels();

        if (questionText) {
            questionText.textContent = questionTextFor(questions[currentIndex]);
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
            prevBtn.disabled = currentIndex === 0 && !draft;
        }
        if (nextBtn) {
            nextBtn.disabled = score === null;
        }

        if (nextBtnText) {
            if (currentIndex === questions.length - 1) {
                nextBtnText.textContent = window.t ? window.t("btn_to_feedback") : "ไปยังข้อเสนอแนะเพิ่มเติม";
            } else {
                nextBtnText.textContent = window.t ? window.t("next") : "ข้อถัดไป";
            }
        }

        renderStars(labels);
    }

    // Advance helper with double-click guard
    let _isAdvancing = false;
    let pendingScore = null;

    function advanceToNext() {
        if (_isAdvancing) return;
        const score = answers[currentIndex];
        if (typeof score !== "number") return;
        if (nextBtn && nextBtn.disabled) return;
        _isAdvancing = true;
        pendingScore = null;

        if (currentIndex < questions.length - 1) {
            currentIndex++;
            renderQuestion();
        } else {
            atFeedback = true;
            const card = document.querySelector(".satisfaction-card");
            if (card) card.hidden = true;
            const feedbackSection = document.getElementById("feedback-section");
            if (feedbackSection) feedbackSection.hidden = false;
        }
        saveProgress();
        if (atFeedback) openConfirmation();
        setTimeout(() => {
            _isAdvancing = false;
        }, 350);
    }

    function renderStars(labels) {
        if (!ratingStars) return;

        const score = answers[currentIndex];
        const ratingLevels = labels || getRatingLabels();
        const existingStars = ratingStars.querySelectorAll(".rating-star");

        if (existingStars.length === 5) {
            existingStars.forEach((star, idx) => {
                const value = idx + 1;
                const ariaLabelText = window.t
                    ? window.t("sat_rating_label", { score: value, label: ratingLevels[value] })
                    : `ระดับคะแนน ${value} (${ratingLevels[value]})`;
                star.setAttribute("aria-label", ariaLabelText);
                star.classList.toggle("active", typeof score === "number" && value <= score);
            });
            return;
        }

        ratingStars.innerHTML = "";

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
                if (_isAdvancing) return;
                if (pendingScore === value) {
                    advanceToNext();
                    return;
                }
                pendingScore = value;
                answers[currentIndex] = value;
                saveProgress();
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
            pendingScore = null;
            if (currentIndex > 0) {
                _repeatStar = null;
                _repeatClicks = 0;
                currentIndex--;
                saveProgress();
                renderQuestion();
            } else if (draft) {
                leaving = true;
                window.location.href = editUrl;
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            advanceToNext();
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

    const card = document.querySelector(".satisfaction-card");
    const feedbackSection = document.getElementById("feedback-section");
    const resultSection = document.getElementById("result-section");
    const submitBtn = document.getElementById("submit-btn");
    const isScore = value => Number.isInteger(value) && value >= 1 && value <= 5;

    function saveProgress() {
        sessionStorage.setItem(progressKey, JSON.stringify({
            answers, questions: questionSnapshot, index: currentIndex, atFeedback, feedback: feedback.value
        }));
    }

    function renderSummary(record, focus = false) {
        card.hidden = true;
        feedbackSection.hidden = true;
        resultSection.hidden = false;
        document.getElementById("survey-part").hidden = true;
        const heading = resultSection.querySelector("h2");
        heading.textContent = label("ส่งแบบประเมินสำเร็จ", "Assessment submitted");

        document.getElementById("summary-home").textContent = label("กลับหน้าหลัก", "Back to home");
        document.getElementById("summary-system").textContent =
            `${selectedSystem ? window.getSystemName?.(selectedSystem) || selectedSystem.name : record.systemName || ""} (${record.systemId})`;
        const date = document.getElementById("summary-date");
        date.dateTime = record.submittedAt;
        date.textContent = new Date(record.submittedAt).toLocaleString(english() ? "en" : "th");
        const satisfaction = document.getElementById("summary-satisfaction");
        satisfaction.replaceChildren();

        const scoreLabel = score => score == null ? label("ไม่มีข้อมูล", "No data") : `${score.toFixed(2)} / 5`;
        const average = record.satisfactionAverage;
        const level = average >= 3.5 ? "sat_high" : average >= 2.5 ? "sat_medium" : "sat_low";
        const scores = record.satisfactionAnswers;
        const answered = scores.filter(isScore).length;

        document.getElementById("summary-average-title").textContent = label("คะแนนความพึงพอใจเฉลี่ย", "Average satisfaction");
        document.getElementById("summary-average").textContent = scoreLabel(average);
        const levelText = document.getElementById("summary-level");
        levelText.textContent = average == null ? "" : window.t(level);
        levelText.dataset.level = average == null ? "" : level;
        document.getElementById("summary-count-title").textContent = label("จำนวนคำถามที่ตอบ", "Questions answered");
        document.getElementById("summary-count").textContent = `${answered} / ${scores.length}`;
        document.getElementById("summary-count-note").textContent = answered === scores.length
            ? label("ตอบครบทุกข้อ", "All questions answered")
            : label(`ข้าม ${scores.length - answered} ข้อ`, `${scores.length - answered} skipped`);
        document.getElementById("summary-details-title").textContent = label("รายละเอียดผลการประเมินรายข้อ", "Scores by question");

        scores.forEach((score, index) => {
            const row = document.createElement("li");
            const title = document.createElement("span");
            const question = record.satisfactionQuestions?.[index];
            title.textContent = `${index + 1}. ${question ? questionTextFor(question) : label("คำถาม", "Question")}`;
            const value = document.createElement("strong");
            value.textContent = scoreLabel(isScore(score) ? score : null);
            row.append(title, value);
            if (isScore(score)) {
                const bar = document.createElement("progress");
                bar.max = 5;
                bar.value = score;
                bar.setAttribute("aria-label", title.textContent);
                row.append(bar);
            }
            satisfaction.append(row);
        });
        if (focus) heading.focus();
    }

    document.getElementById("summary-home").addEventListener("click", () => {
        if (!requestedId) sessionStorage.removeItem(standaloneKey);
    });
    feedback.value = progress?.feedback || "";
    feedback.addEventListener("input", () => {
        saveProgress();
        updateCharCount();
    });
    document.getElementById("edit-satisfaction").onclick = () => {
        pendingScore = null;
        atFeedback = false;
        card.hidden = false;
        feedbackSection.hidden = true;
        saveProgress();
        renderQuestion();
    };

    let summary = matchingCompletion ? completed : null;
    const confirmation = document.getElementById("submit-confirmation");
    function openConfirmation() {
        if (!finished && answers.length > 0 && answers.length === questions.length && answers.every(isScore)) {
            confirmation.returnValue = "";
            confirmation.showModal();
        }
    }
    submitBtn.onclick = openConfirmation;
    confirmation.addEventListener("close", async () => {
        if (confirmation.returnValue !== "confirm") return;
        if (submitBtn.disabled || finished || !answers.length || answers.length !== questions.length || !answers.every(isScore)) return;
        submitBtn.disabled = true;
        const error = document.getElementById("submit-error");
        error.textContent = "";
        const profile = JSON.parse(sessionStorage.getItem("evaluatorProfile") || "{}");
        const record = {
            ...draft,
            id: assessmentId,
            systemId,
            systemName: selectedSystem.name,
            evaluatorId: profile.id || profile.username || "",
            evaluatorName: draft?.evaluatorName || profile.name,
            userRole: draft?.userRole || profile.role,
            satisfactionAnswers: [...answers],
            satisfactionQuestions: questionSnapshot,
            satisfactionAverage: answers.reduce((sum, score) => sum + score, 0) / answers.length,
            feedback: feedback.value.trim(),
            submittedAt: new Date().toISOString()
        };
        try {
            const saved = await EvaluationAPI.submitEvaluation(record);
            summary = { ...record, submittedAt: saved.submittedAt?.includes("T") ? saved.submittedAt : saved.submittedAt ? saved.submittedAt.replace(" ", "T") + "Z" : record.submittedAt };
            sessionStorage.setItem(completionKey, JSON.stringify(summary));
            if (draft) {
                sessionStorage.removeItem(draftKey);
                sessionStorage.removeItem(`itEvaluationProgress:${systemId}`);
            }
            sessionStorage.removeItem(progressKey);
            finished = true;
            renderSummary(summary, true);
        } catch (submissionError) {
            console.error("[Satisfaction] Submission failed", submissionError);
            error.textContent = `${label("บันทึกผลไม่สำเร็จ กรุณาลองอีกครั้ง", "Could not save your assessment. Please try again.")} ${getSatisfactionSubmissionFailureReason(submissionError)}`;
            submitBtn.disabled = false;
        }
    });

    function renderLanguage() {
        if (summary) {
            renderSummary(summary);
            return;
        }
        updateSystemName();
        if (!questions.length) {
            card.hidden = false;
            questionText.textContent = label("ระบบนี้ยังไม่มีคำถาม กรุณาติดต่อผู้ดูแล", "No questions have been configured for this system.");
            nextBtn.disabled = true;
            return;
        }
        renderQuestion();
        updateCharCount();
        document.getElementById("survey-part").hidden = !draft;
        document.getElementById("survey-part").textContent = label("ส่วนที่ 2/2 — ความพึงพอใจ", "Part 2/2 — Satisfaction");
        submitBtn.querySelector("span").textContent = label("ส่งแบบประเมินและดูผลสรุป", "Submit and view summary");
        document.getElementById("edit-satisfaction").textContent = label("ย้อนกลับไปแก้คะแนน", "Edit ratings");
    }

    window.addEventListener("pageshow", event => {
        if (event.persisted) window.location.reload();
    });
    card.hidden = atFeedback;
    feedbackSection.hidden = !atFeedback;
    document.addEventListener("langchange", renderLanguage);
    renderLanguage();
});
