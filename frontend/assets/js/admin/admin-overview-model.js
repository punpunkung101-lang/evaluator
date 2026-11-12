(function (root, factory) {
    "use strict";
    const api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.AdminOverviewModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    function isMock(row) { return row?.isMock === true || String(row?.id || "").startsWith("mock-"); }
    function answerValue(answer) { if (!answer) return undefined; if (Object.prototype.hasOwnProperty.call(answer, "value")) return answer.value; if (Object.prototype.hasOwnProperty.call(answer, "answer")) return answer.answer; if (Object.prototype.hasOwnProperty.call(answer, "answer_value")) { try { return JSON.parse(answer.answer_value); } catch { return answer.answer_value; } } return answer.answerValue; }
    function answerId(answer) { return String(answer?.questionId || answer?.question_id || ""); }
    function latestSubmissions(records) {
        const latest = new Map();
        for (const row of Array.isArray(records) ? records : []) {
            const evaluator = String(row.evaluatorId || row.evaluator_id || row.userId || row.user_id || row.profile?.id || "");
            if (!evaluator) continue;
            const key = `${row.systemId || row.system_id || ""}|${row.assessmentType || row.assessment_type || ""}|${evaluator}`;
            const current = latest.get(key), time = Date.parse(row.submittedAt || row.submitted_at || "") || 0;
            const currentTime = current ? Date.parse(current.submittedAt || current.submitted_at || "") || 0 : -1;
            if (!current || time >= currentTime) latest.set(key, row);
        }
        return [...latest.values()];
    }
    function prepareOverviewCharts(model, evaluations, questions, config = {}) {
        const thresholdValue = config.categoryLowBelow ?? config.satisfactionLowBelow;
        const threshold = Number.isFinite(Number(thresholdValue)) ? Number(thresholdValue) : null;
        const bank = Array.isArray(questions) ? questions : [];
        const rows = latestSubmissions(evaluations);
        const bandCounts = { urgent: 0, review: 0, strength: 0, insufficient: 0 };
        for (const item of model.systems) bandCounts[item.signal?.level || "insufficient"]++;
        const rank = { urgent: 0, review: 1, strength: 2, insufficient: 3 };
        const ordered = model.systems.slice().sort((a, b) => (rank[a.signal?.level || "insufficient"] - rank[b.signal?.level || "insufficient"]) || a.system.id.localeCompare(b.system.id));
        const bands = ordered.map(item => {
            const systemRows = rows.filter(row => (row.systemId || row.system_id) === item.system.id && (row.assessmentType || row.assessment_type) === "effectiveness");
            let low = 0, middle = 0, high = 0;
            for (const record of systemRows) for (const answer of record.answers || []) {
                const q = bank.find(question => String(question.id) === answerId(answer));
                if (!q || q.assessment_type !== "effectiveness" || q.answer_type !== "rating5" || q.is_scored !== true) continue;
                const value = answerValue(answer);
                if (value === "na" || value === "N/A" || answer.isNa === true || answer.is_na === true) continue;
                const score = Number(answer.scoreValue ?? answer.score_value ?? value);
                if (!Number.isFinite(score) || score < 1 || score > 5) continue;
                if (score <= 2) low++; else if (score === 3) middle++; else high++;
            }
            const total = low + middle + high;
            return { id: item.system.id, name: item.system.name, name_en: item.system.name_en || item.system.name, level: item.signal?.level || "insufficient", low: total ? low / total * 100 : 0, middle: total ? middle / total * 100 : 0, high: total ? high / total * 100 : 0, n: item.effectiveness.n };
        });
        return { threshold, bands, levels: bandCounts, averages: model.systems.map(item => ({ id: item.system.id, name: item.system.name, name_en: item.system.name_en || item.system.name, effectiveness: item.effectivenessAverage, effectivenessN: item.effectiveness.n, satisfaction: item.satisfaction?.average ?? null, satisfactionN: item.satisfaction?.n || 0 })) };
    }
    function prepareSystemCharts(effectiveness, records, questions, config = {}) {
        const bank = Array.isArray(questions) ? questions : [];
        const uniqueRecords = latestSubmissions(records);
        const answerRows = uniqueRecords.flatMap(record => record.answers || []);
        const categories = Object.values(effectiveness?.categoryStats || {});
        const low = [], middle = [], high = [], na = [];
        for (const category of categories) {
            let counts = { low: 0, middle: 0, high: 0, na: 0 };
            const ids = new Set(bank.filter(q => q.assessment_type === "effectiveness" && (q.section || q.indicator_group || "uncategorized") === category.section && q.answer_type === "rating5" && q.is_scored === true).map(q => String(q.id)));
            for (const answer of answerRows) {
                if (!ids.has(answerId(answer))) continue;
                const value = answerValue(answer);
                if (value === "na" || value === "N/A" || answer.isNa === true || answer.is_na === true) { counts.na++; continue; }
                const score = Number(answer.scoreValue ?? answer.score_value ?? value);
                if (!Number.isFinite(score) || score < 1 || score > 5) continue;
                if (score <= 2) counts.low++; else if (score === 3) counts.middle++; else counts.high++;
            }
            const total = counts.low + counts.middle + counts.high + counts.na;
            low.push(total ? counts.low / total * 100 : 0); middle.push(total ? counts.middle / total * 100 : 0); high.push(total ? counts.high / total * 100 : 0); na.push(total ? counts.na / total * 100 : 0);
        }
        const problems = bank.find(q => q.assessment_type === "effectiveness" && q.id === "issues_found");
        const problemCounts = new Map();
        if (problems) for (const record of uniqueRecords) for (const answer of record.answers || []) if (answerId(answer) === problems.id) {
            const value = answerValue(answer), values = Array.isArray(value) ? value : value == null ? [] : [value];
            for (const choice of new Set(values.map(String))) { const option = (problems.options || []).find(item => item.value === choice); if (!option?.exclusive && choice !== "problem_9" && choice !== "other") problemCounts.set(choice, (problemCounts.get(choice) || 0) + 1); }
        }
        const problemData = [...problemCounts].map(([key, count]) => ({ label: (problems.options || []).find(item => item.value === key)?.label || key, count })).sort((a, b) => b.count - a.count);
        const thresholdValue = config.categoryLowBelow ?? config.satisfactionLowBelow;
        const threshold = Number.isFinite(Number(thresholdValue)) ? Number(thresholdValue) : null;
        return { threshold, categories: categories.map(item => item.section), n: categories.map(item => item.n), low, middle, high, na, problems: problemData, averages: categories.map(item => item.average), satisfaction: Number.isFinite(effectiveness?.satisfactionAverage) ? effectiveness.satisfactionAverage : null };
    }
    function compute(systems, evaluations, questions, scoring, config) {
        const rows = Array.isArray(evaluations) ? evaluations : [];
        const catalog = Array.isArray(systems) ? systems : [];
        const bank = (Array.isArray(questions) ? questions : []).map(question => ({
            ...question,
            assessmentType: question.assessmentType || question.assessment_type,
            assessment_type: question.assessment_type || question.assessmentType,
            systemId: question.systemId ?? question.system_id ?? null,
            system_id: question.system_id ?? question.systemId ?? null
        }));
        const signals = scoring.buildImprovementSignals(rows, bank, catalog, config);
        const byId = new Map(signals.map(signal => [signal.systemId, signal]));
        const detail = catalog.map(system => {
            const systemRows = rows.filter(row => row.systemId === system.id);
            const effectRows = systemRows.filter(row => row.assessmentType === "effectiveness");
            const satisfactionRows = systemRows.filter(row => row.assessmentType === "satisfaction");
            const effectQuestions = bank.filter(question => question.assessmentType === "effectiveness" && (question.systemId === system.id || question.indicator_group === "core"));
            const satisfactionQuestions = bank.filter(question => question.assessmentType === "satisfaction" && (question.systemId === system.id || question.indicator_group === "core"));
            const effectiveness = scoring.summarizeEffectiveness(effectRows, effectQuestions);
            const satisfaction = scoring.summarizeSatisfactionAssessment(satisfactionRows, satisfactionQuestions).find(item => item.systemId === system.id) || null;
            const categoryAverages = Object.values(effectiveness.categoryStats).map(item => item.average).filter(Number.isFinite);
            const effectivenessAverage = categoryAverages.length ? categoryAverages.reduce((sum, value) => sum + value, 0) / categoryAverages.length : null;
            return { system, effectiveness, satisfaction, effectivenessAverage, signal: byId.get(system.id), mockCount: systemRows.filter(isMock).length };
        });
        return {
            systems: detail,
            mockCount: rows.filter(isMock).length,
            counts: detail.reduce((counts, item) => { counts[item.signal?.level || "insufficient"] += 1; return counts; }, { urgent: 0, review: 0, strength: 0, insufficient: 0 })
        };
    }
    return Object.freeze({ compute, prepareOverviewCharts, prepareSystemCharts });
});
