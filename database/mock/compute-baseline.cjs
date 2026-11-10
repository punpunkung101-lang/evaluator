const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const EffectivenessExamples = require('../../frontend/assets/js/user/effectiveness-examples.js');
const EffectivenessScoring = require('../../frontend/assets/js/admin/effectiveness-scoring.js');
const ImprovementPriority = require('../../frontend/assets/js/admin/improvement-priority.js');
const AdminOverviewModel = require('../../frontend/assets/js/admin/admin-overview-model.js');

function computeBaseline(dbPath = path.resolve(__dirname, '../evaluator.db')) {
    const db = new DatabaseSync(dbPath);
    const systems = db.prepare('SELECT id, name, name_en, sort_order FROM systems WHERE active=1 ORDER BY sort_order, id').all();
    const quantRecords = db.prepare('SELECT record_json FROM quantitative_records ORDER BY submitted_at DESC').all().map(r => JSON.parse(r.record_json));
    const evalQuery = `
        SELECT e.id, e.system_id AS systemId, e.system_name AS systemName,
               e.evaluator_id AS evaluatorId, e.evaluator_name AS evaluatorName,
               e.user_role AS userRole, e.before_answers AS beforeAnswers,
               e.after_answers AS afterAnswers, e.before_average AS beforeAverage,
               e.after_average AS afterAverage, e.comparable_count AS comparableCount,
               COALESCE(s.answers, '[]') AS satisfactionAnswers, s.average AS satisfactionAverage,
               e.feedback, e.submitted_at AS submittedAt
        FROM evaluations e
        LEFT JOIN satisfactions s ON s.evaluation_id = e.id
        ORDER BY e.submitted_at DESC
    `;
    const evalRows = db.prepare(evalQuery).all().map(r => ({
        ...r,
        beforeAnswers: JSON.parse(r.beforeAnswers || '[]'),
        afterAnswers: JSON.parse(r.afterAnswers || '[]'),
        satisfactionAnswers: JSON.parse(r.satisfactionAnswers || '[]')
    }));

    const model = AdminOverviewModel.compute(systems, quantRecords, evalRows);
    const effectivenessMap = new Map();
    const satisfactionMap = new Map();

    for (const system of model.systems) {
        const qRows = model.quantBySystem.get(system.id) || [];
        const sRows = model.satisfactionBySystem.get(system.id) || [];
        effectivenessMap.set(system.id, qRows.length
            ? EffectivenessScoring.summarizeSystem(qRows, EffectivenessExamples.metrics)
            : null);
        satisfactionMap.set(system.id, sRows.length
            ? EffectivenessScoring.summarizeSatisfaction(sRows).find(item => item.systemId === system.id) || null
            : null);
    }

    const ranked = ImprovementPriority.rankSystems(model.systems, effectivenessMap, satisfactionMap);

    const statuses = {};
    for (const row of ranked) {
        statuses[row.systemId] = {
            systemId: row.systemId,
            name: row.name,
            sortOrder: row.sortOrder,
            status: row.status,
            nEffectiveness: row.effectiveness ? row.effectiveness.n : 0,
            nSatisfaction: row.satisfaction ? row.satisfaction.n : 0,
            beforeScore: row.effectiveness ? row.effectiveness.beforeScore : null,
            afterScore: row.effectiveness ? row.effectiveness.afterScore : null,
            summary: row.effectiveness ? row.effectiveness.summary : 'no-data',
            coverage: row.effectiveness ? row.effectiveness.coverage : 0,
            satisfactionAverage: row.satisfactionAverage,
            satisfactionScore: row.satisfactionScore,
            combined: row.combined,
            preliminary: row.preliminary,
            lowSample: row.lowSample,
            metricImprovement: row.metricImprovement
        };
    }

    return { systems: model.systems.map(s => s.id), statuses, ranked };
}

if (require.main === module) {
    const result = computeBaseline();
    const outputPath = path.resolve(__dirname, 'baseline-statuses.json');
    fs.writeFileSync(outputPath, JSON.stringify(result.statuses, null, 2), 'utf-8');
    console.log('Saved baseline-statuses.json for ' + Object.keys(result.statuses).length + ' systems.');
    console.table(Object.values(result.statuses).map(r => ({
        id: r.systemId,
        status: r.status,
        nEff: r.nEffectiveness,
        nSat: r.nSatisfaction,
        summary: r.summary,
        effAfter: r.afterScore?.toFixed(1) ?? 'null',
        satAvg: r.satisfactionAverage?.toFixed(2) ?? 'null',
        comb: r.combined?.toFixed(1) ?? 'null',
        prelim: r.preliminary,
        lowSamp: r.lowSample
    })));
}

module.exports = { computeBaseline };
