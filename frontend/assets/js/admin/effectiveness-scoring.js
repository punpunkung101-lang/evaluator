(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.EffectivenessScoring = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    const DEFAULT_SCORING_CONFIG = Object.freeze({
        minimumSample: 5,
        interpretationBands: [
            { min: 4.51, max: 5, code: "very-high", label: "มากที่สุด" },
            { min: 3.51, max: 4.5, code: "high", label: "มาก" },
            { min: 2.51, max: 3.5, code: "moderate", label: "ปานกลาง" },
            { min: 1.51, max: 2.5, code: "low", label: "น้อย" },
            { min: 1, max: 1.5, code: "very-low", label: "น้อยที่สุด" }
        ],
        improvement: {
            minimumRespondents: 10,
            categoryLowBelow: 2.61,
            satisfactionLowBelow: 2.61,
            lowRatingAtOrBelow: 2,
            lowRatingShareForReview: 0.3,
            lowRatingShareForUrgent: 0.5,
            commonProblemShareForReview: 0.25,
            commonImprovementShareForReview: 0.35,
            urgentLowCategoryCount: 2,
            urgentProblemShare: 0.4,
            coreCategories: ["usability", "efficiency", "effectiveness", "data_quality", "tracking_transparency", "reliability"]
        }
    });

    function timestamp(record) {
        const value = Date.parse(record?.submittedAt || record?.submitted_at || "");
        return Number.isFinite(value) ? value : 0;
    }

    function evaluatorId(record) {
        return String(record?.userId || record?.user_id || record?.profile?.id || "");
    }

    function satisfactionLevel(value) {
        if (!Number.isFinite(value) || value < 1 || value > 5) return null;
        if (value >= 4.51) return "very-high";
        if (value >= 3.51) return "high";
        if (value >= 2.51) return "moderate";
        if (value >= 1.51) return "low";
        return "very-low";
    }

    function answerQuestionId(answer) {
        return String(answer?.questionId || answer?.question_id || "");
    }

    function answerValue(answer) {
        if (!answer || typeof answer !== "object") return answer;
        if (Object.prototype.hasOwnProperty.call(answer, "value")) return answer.value;
        if (Object.prototype.hasOwnProperty.call(answer, "answer")) return answer.answer;
        if (Object.prototype.hasOwnProperty.call(answer, "answerValue")) {
            try { return JSON.parse(answer.answerValue); } catch { return answer.answerValue; }
        }
        return undefined;
    }

    function answerScore(answer, question) {
        if (question?.answer_type !== "rating5" || question?.is_scored !== true) return { scored: false, notApplicable: false, value: null };
        const value = answerValue(answer);
        const notApplicable = answer?.isNa === true || answer?.is_na === true || value === "na" || value === "N/A";
        if (notApplicable) return { scored: false, notApplicable: true, value: null };
        const candidate = Number.isFinite(answer?.scoreValue) ? answer.scoreValue : Number.isFinite(answer?.score_value) ? answer.score_value : value;
        const numeric = typeof candidate === "number" ? candidate : (typeof candidate === "string" && candidate.trim() !== "" ? Number(candidate) : NaN);
        if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) return { scored: false, notApplicable: false, value: null };
        return { scored: true, notApplicable: false, value: numeric };
    }

    function respondentId(record) {
        return String(record?.evaluatorId || record?.evaluator_id || record?.userId || record?.user_id || record?.profile?.id || "");
    }

    function systemId(record) { return String(record?.systemId || record?.system_id || ""); }
    function assessmentType(record) { return String(record?.assessmentType || record?.assessment_type || ""); }
    function submissionAnswers(record) { return Array.isArray(record?.answers) ? record.answers : []; }

    function dedupeSubmissions(records, type) {
        const latest = new Map();
        for (const record of Array.isArray(records) ? records : []) {
            if (!record || (type && assessmentType(record) && assessmentType(record) !== type)) continue;
            const system = systemId(record), evaluator = respondentId(record);
            if (!system || !evaluator) continue;
            const key = `${system}\u0000${evaluator}`;
            const current = latest.get(key);
            if (!current || timestamp(record) >= timestamp(current)) latest.set(key, record);
        }
        return [...latest.values()];
    }

    function questionMap(questions) {
        return new Map((Array.isArray(questions) ? questions : []).map(question => [String(question.id), question]));
    }

    function interpretation(value, config = DEFAULT_SCORING_CONFIG) {
        if (!Number.isFinite(value)) return null;
        const bands = Array.isArray(config.interpretationBands) ? config.interpretationBands : DEFAULT_SCORING_CONFIG.interpretationBands;
        return bands.find(band => value >= band.min && value <= band.max) || null;
    }

    function makeStats(entries, config = DEFAULT_SCORING_CONFIG) {
        const numeric = entries.filter(entry => entry.score.scored);
        const naCount = entries.filter(entry => entry.score.notApplicable).length;
        const ids = new Set(numeric.map(entry => respondentId(entry.record)).filter(Boolean));
        const average = numeric.length ? numeric.reduce((sum, entry) => sum + entry.score.value, 0) / numeric.length : null;
        const band = interpretation(average, config);
        return {
            average,
            n: ids.size,
            responseCount: numeric.length,
            naCount,
            level: band?.code ?? null,
            levelLabel: band?.label ?? null,
            lowSample: ids.size < (config.minimumSample ?? DEFAULT_SCORING_CONFIG.minimumSample)
        };
    }

    function collectRatings(records, questions) {
        const byQuestion = new Map();
        const byCategory = new Map();
        const all = [];
        const qById = questionMap(questions);
        for (const record of records) {
            for (const answer of submissionAnswers(record)) {
                const qid = answerQuestionId(answer);
                const question = qById.get(qid);
                if (!question || question.assessment_type !== "effectiveness") continue;
                const score = answerScore(answer, question);
                if (!score.scored && !score.notApplicable) continue;
                const entry = { record, answer, question, score };
                if (!byQuestion.has(qid)) byQuestion.set(qid, []);
                byQuestion.get(qid).push(entry);
                const category = String(question.section || question.indicator_group || "uncategorized");
                if (!byCategory.has(category)) byCategory.set(category, []);
                byCategory.get(category).push(entry);
                all.push(entry);
            }
        }
        return { byQuestion, byCategory, all };
    }

    function summarizeRatingRows(records, questions, config = DEFAULT_SCORING_CONFIG) {
        const collected = collectRatings(records, questions);
        const questionStats = {};
        const categoryStats = {};
        for (const question of (questions || []).filter(item => item.assessment_type === "effectiveness" && item.answer_type === "rating5" && item.is_scored === true)) {
            questionStats[question.id] = { id: question.id, section: question.section, text: question.text, ...makeStats(collected.byQuestion.get(question.id) || [], config) };
        }
        for (const [category, entries] of collected.byCategory) categoryStats[category] = { section: category, ...makeStats(entries, config) };
        const scored = collected.all.filter(entry => entry.score.scored);
        const lowCount = scored.filter(entry => entry.score.value <= (config.improvement?.lowRatingAtOrBelow ?? DEFAULT_SCORING_CONFIG.improvement.lowRatingAtOrBelow)).length;
        return {
            n: new Set(records.map(respondentId).filter(Boolean)).size,
            lowSample: new Set(records.map(respondentId).filter(Boolean)).size < (config.minimumSample ?? DEFAULT_SCORING_CONFIG.minimumSample),
            questionStats,
            categoryStats,
            ratingResponseCount: scored.length,
            naCount: collected.all.filter(entry => entry.score.notApplicable).length,
            lowRatingCount: lowCount,
            lowRatingShare: scored.length ? lowCount / scored.length : null
        };
    }

    function groupRows(records, getKey, getLabel) {
        const groups = new Map();
        for (const record of records) {
            const key = String(getKey(record) || "unknown");
            if (!groups.has(key)) groups.set(key, { key, label: String(getLabel(record) || key), records: [] });
            groups.get(key).records.push(record);
        }
        return [...groups.values()];
    }

    function summarizeEffectiveness(records, questions, config = DEFAULT_SCORING_CONFIG) {
        const latest = dedupeSubmissions(records, "effectiveness");
        const effectiveQuestions = (questions || []).filter(question => question.assessment_type === "effectiveness");
        const overall = summarizeRatingRows(latest, effectiveQuestions, config);
        const byRole = {};
        for (const group of groupRows(latest, row => row.respondentRole || row.respondent_role, row => row.respondentRoleLabel || row.respondent_role_label)) {
            byRole[group.key] = { role: group.key, roleLabel: group.label, ...summarizeRatingRows(group.records, effectiveQuestions, config) };
        }
        const priorUseGroups = {};
        for (const group of groupRows(latest, row => submissionAnswers(row).find(answer => answerQuestionId(answer) === "history_experience") ? answerValue(submissionAnswers(row).find(answer => answerQuestionId(answer) === "history_experience")) : "unknown", row => row)) {
            priorUseGroups[group.key] = { priorUse: group.key, ...summarizeRatingRows(group.records, effectiveQuestions, config) };
        }
        return { assessmentType: "effectiveness", records: latest.length, ...overall, byRole, byPriorUse: priorUseGroups };
    }

    function averagePerSubmission(records, questionIds, qById, config) {
        const entries = [];
        for (const record of records) {
            const rated = [];
            let naCount = 0;
            for (const answer of submissionAnswers(record)) {
                if (!questionIds.has(answerQuestionId(answer))) continue;
                const score = answerScore(answer, qById.get(answerQuestionId(answer)));
                if (score.notApplicable) naCount += 1;
                if (score.scored) rated.push(score.value);
            }
            if (rated.length) entries.push({ record, score: { scored: true, notApplicable: false, value: rated.reduce((sum, value) => sum + value, 0) / rated.length } });
            if (naCount) entries.push({ record, score: { scored: false, notApplicable: true, value: null } });
        }
        const stats = makeStats(entries, config);
        stats.responseCount = entries.filter(entry => entry.score.scored).length;
        stats.naCount = entries.filter(entry => entry.score.notApplicable).length;
        return stats;
    }

    function summarizeSatisfactionAssessment(records, questions, config = DEFAULT_SCORING_CONFIG) {
        const latest = dedupeSubmissions(records, "satisfaction");
        const qById = questionMap(questions);
        const systemGroups = groupRows(latest, systemId, row => row.systemName || row.system_name || systemId(row));
        return systemGroups.map(group => {
            const rows = group.records;
            const coreIds = new Set((questions || []).filter(question => question.assessment_type === "satisfaction" && question.indicator_group === "core").map(question => question.id));
            const specificQuestions = (questions || []).filter(question => question.assessment_type === "satisfaction" && question.indicator_group === "specific" && question.system_id === group.key);
            const specificIds = new Set(specificQuestions.map(question => question.id));
            const allIds = new Set([...coreIds, ...specificIds]);
            const core = averagePerSubmission(rows, coreIds, qById, config);
            const overall = averagePerSubmission(rows, allIds, qById, config);
            const specific = specificQuestions.map(question => ({ id: question.id, text: question.text, ...averagePerSubmission(rows, new Set([question.id]), qById, config) }));
            const byRole = {};
            for (const roleGroup of groupRows(rows, row => row.respondentRole || row.respondent_role, row => row.respondentRoleLabel || row.respondent_role_label)) {
                const roleCore = averagePerSubmission(roleGroup.records, coreIds, qById, config);
                const roleOverall = averagePerSubmission(roleGroup.records, allIds, qById, config);
                byRole[roleGroup.key] = { role: roleGroup.key, roleLabel: roleGroup.label, n: roleOverall.n, average: roleOverall.average, coreAverage: roleCore.average, lowSample: roleOverall.lowSample, specific: specificQuestions.map(question => ({ id: question.id, ...averagePerSubmission(roleGroup.records, new Set([question.id]), qById, config) })) };
            }
            const responseRecords = rows.map(row => {
                const rowCore = averagePerSubmission([row], coreIds, qById, config);
                const rowOverall = averagePerSubmission([row], allIds, qById, config);
                return { evaluatorId: respondentId(row), role: row.respondentRole || row.respondent_role || "", roleLabel: row.respondentRoleLabel || row.respondent_role_label || "", average: rowOverall.average, coreAverage: rowCore.average, submittedAt: row.submittedAt || row.submitted_at || "" };
            });
            return { systemId: group.key, systemName: group.label, n: overall.n, average: overall.average, level: satisfactionLevel(overall.average), lowSample: overall.lowSample, overall, core, specific, byRole, questionStats: Object.fromEntries([...coreIds, ...specificIds].map(id => [id, { id, ...averagePerSubmission(rows, new Set([id]), qById, config) }])), records: responseRecords };
        });
    }

    function countSelections(records, questionId, question) {
        const countByValue = new Map();
        for (const record of records) {
            const answer = submissionAnswers(record).find(item => answerQuestionId(item) === questionId);
            const value = answerValue(answer);
            const values = Array.isArray(value) ? value : value == null ? [] : [value];
            for (const option of new Set(values.map(String))) {
                const definition = (question?.options || []).find(item => item.value === option);
                if (definition?.exclusive || option === "problem_9" || option === "other") continue;
                countByValue.set(option, (countByValue.get(option) || 0) + 1);
            }
        }
        return [...countByValue].map(([value, count]) => ({ value, label: (question?.options || []).find(item => item.value === value)?.label || value, count, share: records.length ? count / records.length : 0 })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    }

    function buildImprovementSignals(evaluations, questions, systems, config = {}) {
        const criteria = { ...DEFAULT_SCORING_CONFIG.improvement, ...(config.improvement || {}) };
        const scoringConfig = { ...DEFAULT_SCORING_CONFIG, ...config };
        const all = Array.isArray(evaluations) ? evaluations : [];
        const effectiveQuestions = (questions || []).filter(question => question.assessment_type === "effectiveness");
        const satisfactionQuestions = (questions || []).filter(question => question.assessment_type === "satisfaction");
        const issueQuestion = effectiveQuestions.find(question => question.id === "issues_found");
        const improvementQuestion = effectiveQuestions.find(question => question.id === "improvement_priorities");
        return (systems || []).map(system => {
            const id = String(system.id || system.systemId || "");
            const effectRows = dedupeSubmissions(all.filter(row => systemId(row) === id), "effectiveness");
            const satRows = dedupeSubmissions(all.filter(row => systemId(row) === id), "satisfaction");
            const effect = summarizeEffectiveness(effectRows, effectiveQuestions, scoringConfig);
            const satisfaction = summarizeSatisfactionAssessment(satRows, satisfactionQuestions, scoringConfig).find(row => row.systemId === id) || null;
            const lowCategories = criteria.coreCategories.filter(category => {
                const stat = effect.categoryStats[category];
                return stat && stat.average !== null && stat.average < criteria.categoryLowBelow;
            });
            const scores = collectRatings(effectRows, effectiveQuestions).all.filter(entry => entry.score.scored).map(entry => entry.score.value);
            const lowRatingCount = scores.filter(score => score <= criteria.lowRatingAtOrBelow).length;
            const lowRatingShare = scores.length ? lowRatingCount / scores.length : 0;
            const problems = countSelections(effectRows, "issues_found", issueQuestion);
            const improvements = countSelections(effectRows, "improvement_priorities", improvementQuestion);
            const commonProblem = problems[0] || null;
            const commonImprovement = improvements[0] || null;
            const n = effect.n;
            const satN = satisfaction?.n || 0;
            const satisfactionLow = satisfaction?.average != null && satisfaction.average < criteria.satisfactionLowBelow;
            const problemFrequent = Boolean(commonProblem && commonProblem.share >= criteria.commonProblemShareForReview);
            const improvementFrequent = Boolean(commonImprovement && commonImprovement.share >= criteria.commonImprovementShareForReview);
            const reasons = [];
            let level;
            if (n < criteria.minimumRespondents || satN < criteria.minimumRespondents) {
                level = "insufficient";
                reasons.push({ code: "low-sample", message: `ข้อมูลยังไม่เพียงพอ (ประสิทธิผล n=${n}, ความพึงพอใจ n=${satN}; ต้องมีอย่างน้อย ${criteria.minimumRespondents})` });
            } else {
                if (lowCategories.length) reasons.push({ code: "low-categories", message: `มี ${lowCategories.length} หมวดที่คะแนนเฉลี่ยต่ำกว่า ${criteria.categoryLowBelow.toFixed(2)}: ${lowCategories.join(", ")}` });
                if (satisfactionLow) reasons.push({ code: "low-satisfaction", message: `คะแนนความพึงพอใจเฉลี่ย ${satisfaction.average.toFixed(2)} ต่ำกว่า ${criteria.satisfactionLowBelow.toFixed(2)}` });
                if (lowRatingShare >= criteria.lowRatingShareForReview) reasons.push({ code: "many-low-ratings", message: `คำตอบคะแนน 1–2 มีสัดส่วน ${(lowRatingShare * 100).toFixed(0)}%` });
                if (problemFrequent) reasons.push({ code: "common-problem", message: `ปัญหาที่พบมากคือ “${commonProblem.label}” (${(commonProblem.share * 100).toFixed(0)}%)` });
                if (improvementFrequent) reasons.push({ code: "common-improvement", message: `ความต้องการปรับปรุงที่เลือกมากคือ “${commonImprovement.label}” (${(commonImprovement.share * 100).toFixed(0)}%)` });
                const urgentCategories = lowCategories.length >= criteria.urgentLowCategoryCount;
                const urgentCombined = satisfactionLow && lowRatingShare >= criteria.lowRatingShareForUrgent;
                const urgentProblems = satisfactionLow && commonProblem && commonProblem.share >= criteria.urgentProblemShare;
                const needsReview = lowCategories.length > 0 || satisfactionLow || lowRatingShare >= criteria.lowRatingShareForReview || problemFrequent || improvementFrequent;
                level = (urgentCategories && (satisfactionLow || lowRatingShare >= criteria.lowRatingShareForReview || problemFrequent)) || urgentCombined || urgentProblems
                    ? "urgent"
                    : needsReview ? "review" : "strength";
                if (!reasons.length) reasons.push({ code: "no-trigger", message: "ไม่พบสัญญาณต่ำกว่าเกณฑ์จากปัจจัยที่กำหนด จุดแข็งควรรักษาไว้" });
            }
            const labels = { urgent: "ควรปรับปรุงเร่งด่วน", review: "ควรตรวจสอบเพิ่มเติม", strength: "จุดแข็งควรรักษา", insufficient: "ข้อมูลไม่เพียงพอ" };
            return { systemId: id, systemName: system.name || system.systemName || id, level, label: labels[level], n, satisfactionN: satN, lowCategoryCount: lowCategories.length, lowCategories, satisfactionAverage: satisfaction?.average ?? null, lowRatingShare, commonProblem, commonImprovement, factors: { lowCategories, satisfactionLow, lowRatingCount, lowRatingShare, commonProblem, commonImprovement }, reasons };
        });
    }

    return Object.freeze({ DEFAULT_SCORING_CONFIG, satisfactionLevel, answerScore, summarizeEffectiveness, summarizeSatisfactionAssessment, buildImprovementSignals });
});
