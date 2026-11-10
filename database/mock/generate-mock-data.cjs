const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const EffectivenessExamples = require('../../frontend/assets/js/user/effectiveness-examples.js');
const EffectivenessScoring = require('../../frontend/assets/js/admin/effectiveness-scoring.js');
const ImprovementPriority = require('../../frontend/assets/js/admin/improvement-priority.js');
const AdminOverviewModel = require('../../frontend/assets/js/admin/admin-overview-model.js');

// Seeded PRNG (mulberry32)
function mulberry32(a) {
    return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Generate deterministic hex string
function randomHex(rng, length) {
    const chars = '0123456789abcdef';
    let str = '';
    for (let i = 0; i < length; i++) {
        str += chars[Math.floor(rng() * 16)];
    }
    return str;
}

// Fixed 40 mock accounts
function generateMockUsers(rng) {
    const existingFive = [
        { id: '90000001', username: 'mock_evaluator_01', displayName: 'ผู้ประเมินตัวอย่าง 01', role: 'teacher', hash: '0465287cd53b077b6e2150f54a1fbd60e75e64fcdd00e92d16b61082932cdb55', salt: '67bf9c05e5b47e76055c6a20ad21c43a8fa1d134cc395b58d4467bcf80e7f6aa', iter: 120000 },
        { id: '90000002', username: 'mock_evaluator_02', displayName: 'ผู้ประเมินตัวอย่าง 02', role: 'staff', hash: '71f2f48b55a58ea7cce8f7a7a25d06e07c659b3e0abe1c2bf5d0754b6925cc01', salt: '670688480b2e1b2b392e230ea91c47cf440625e231a1997a2fa3c6ffedf8aa55', iter: 120000 },
        { id: '90000003', username: 'mock_evaluator_03', displayName: 'ผู้ประเมินตัวอย่าง 03', role: 'student', hash: 'd6c88e95c5f8c211466c6bb3d136d364f49f6e9e3c83400bd4161e617e63fb03', salt: '117972e9c25308044aab33d5f9b96b96b67ca2b6f7c456dc5ca201d6d892f040', iter: 120000 },
        { id: '90000004', username: 'mock_evaluator_04', displayName: 'ผู้ประเมินตัวอย่าง 04', role: 'teacher', hash: 'f8db6a63a0e3eb11364de51b03756d6d00a1898d9dd0b56b443be0db0cf8cf32', salt: '3aadc7730087b3d1d8d05650a3714cb1050464c47172e294d72df5ea06761609', iter: 120000 },
        { id: '90000005', username: 'mock_evaluator_05', displayName: 'ผู้ประเมินตัวอย่าง 05', role: 'staff', hash: '871486000799ae0e699ede249182a04a6049aebd56b476776506e02989c00765', salt: '78950edfb7abc45b8325e80f4408c5b54e5c540b2466177d98e285a7ec341a86', iter: 120000 }
    ];

    const users = [...existingFive];
    const roles = ['student', 'teacher', 'staff'];
    for (let i = 6; i <= 40; i++) {
        const id = '9' + String(i).padStart(7, '0');
        const numStr = String(i).padStart(2, '0');
        const role = roles[(i - 6) % roles.length];
        users.push({
            id,
            username: `mock_evaluator_${numStr}`,
            displayName: `ผู้ประเมินตัวอย่าง ${numStr}`,
            role,
            hash: randomHex(rng, 64),
            salt: randomHex(rng, 64),
            iter: 120000
        });
    }
    return users;
}

// Generate date within 2026-05-01 to 2026-11-08 spanning all 7 months
function generateDates(n, offset = 0) {
    const dates = [];
    for (let i = 0; i < n; i++) {
        // distribute across 7 months: May(5), Jun(6), Jul(7), Aug(8), Sep(9), Oct(10), Nov(11)
        const month = 5 + Math.floor((i * 7) / n);
        const day = 1 + ((i * 11 + offset * 3) % 27);
        const hour = 9 + ((i * 3 + offset) % 9);
        const minute = 10 + ((i * 7 + offset * 5) % 48);
        const dateStr = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;
        dates.push(dateStr);
    }
    return dates.sort();
}

function generateMockDataset(seed = 42819) {
    const rng = mulberry32(seed);
    const users = generateMockUsers(rng);
    const userMap = new Map(users.map(u => [u.id, u]));

    // All 21 system IDs in order
    const systemIds = [
        'SYS001', 'SYS002', 'SYS003', 'SYS004', 'SYS005', 'SYS006', 'SYS007',
        'SYS008', 'SYS009', 'SYS010', 'SYS011', 'SYS012', 'SYS013', 'SYS014',
        'SYS015', 'SYS016', 'SYS017', 'SYS018', 'SYS019', 'SYS020', 'SYS021'
    ];

    // System configurations based on baseline requirements
    // Status targets:
    // SYS015: improve (satAvg < 2.61, after-better)
    // SYS012, SYS013, SYS014: improve (before-better, satAvg 2.61-3.41)
    // SYS016: improve (satAvg < 2.61, preliminary=true)
    // SYS018: watch (satAvg 2.61-3.41, no effectiveness)
    // SYS009, SYS010, SYS011: watch (similar, satAvg 2.61-3.41)
    // SYS001-SYS008, SYS021: good (after-better, satAvg >= 3.41)
    // SYS017: good (after-better, no satisfaction)
    // SYS019, SYS020: no-data

    const systemConfig = {
        SYS001: { mode: 'good', satTier: 'high', nEff: 16, nSat: 15 },
        SYS002: { mode: 'good', satTier: 'high', nEff: 14, nSat: 16 },
        SYS003: { mode: 'good', satTier: 'high', nEff: 18, nSat: 17 },
        SYS004: { mode: 'good', satTier: 'high', nEff: 15, nSat: 14 },
        SYS005: { mode: 'good', satTier: 'high', nEff: 17, nSat: 18 },
        SYS006: { mode: 'good', satTier: 'high', nEff: 13, nSat: 15 },
        SYS007: { mode: 'good', satTier: 'high', nEff: 19, nSat: 16 },
        SYS008: { mode: 'good', satTier: 'high', nEff: 15, nSat: 14 },
        SYS009: { mode: 'similar', satTier: 'moderate', nEff: 16, nSat: 17 },
        SYS010: { mode: 'similar', satTier: 'moderate', nEff: 14, nSat: 15 },
        SYS011: { mode: 'similar', satTier: 'moderate', nEff: 15, nSat: 14 },
        SYS012: { mode: 'before-better', satTier: 'moderate', nEff: 17, nSat: 16 },
        SYS013: { mode: 'before-better', satTier: 'moderate', nEff: 16, nSat: 15 },
        SYS014: { mode: 'before-better', satTier: 'moderate', nEff: 18, nSat: 14 },
        SYS015: { mode: 'good', satTier: 'low', nEff: 14, nSat: 15 },
        SYS016: { mode: 'preliminary', satTier: 'low', nEff: 15, nSat: 16 },
        SYS017: { mode: 'good', satTier: 'none', nEff: 16, nSat: 0 },
        SYS018: { mode: 'none', satTier: 'moderate', nEff: 0, nSat: 15 },
        SYS019: { mode: 'none', satTier: 'none', nEff: 0, nSat: 0 },
        SYS020: { mode: 'none', satTier: 'none', nEff: 0, nSat: 0 },
        SYS021: { mode: 'good', satTier: 'high', nEff: 15, nSat: 16 }
    };

    // Helper: shuffle array with rng
    function shuffle(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    // Base quantitative metrics definition
    const baseMetricDefs = [
        { id: 'accept_time', unit: 'ชั่วโมง', direction: 'decrease', weight: 8, baseBefore: 22.0, baseAfter: 15.4 },
        { id: 'done_time', unit: 'วัน', direction: 'decrease', weight: 12, baseBefore: 6.0, baseAfter: 4.2 },
        { id: 'on_time', unit: '%', direction: 'increase', weight: 10, baseBefore: 64.0, baseAfter: 83.2 },
        { id: 'complete_first', unit: '%', direction: 'increase', weight: 8, baseBefore: 62.0, baseAfter: 80.6 },
        { id: 'repeat', unit: '%', direction: 'decrease', weight: 9, baseBefore: 14.0, baseAfter: 9.8 },
        { id: 'lost', unit: '%', direction: 'decrease', weight: 8, baseBefore: 4.5, baseAfter: 3.15 },
        { id: 'sat_requester', unit: '1–5', direction: 'increase', weight: 15, baseBefore: 3.2, baseAfter: 4.16 },
        { id: 'sat_staff', unit: '1–5', direction: 'increase', weight: 10, baseBefore: 3.3, baseAfter: 4.29 },
        { id: 'requester_minutes', unit: 'นาที', direction: 'decrease', weight: 5, baseBefore: 18.0, baseAfter: 12.6 },
        { id: 'staff_minutes', unit: 'นาที', direction: 'decrease', weight: 7, baseBefore: 25.0, baseAfter: 17.5 },
        { id: 'cost_per_case', unit: 'บาท', direction: 'decrease', weight: 8, baseBefore: 120.0, baseAfter: 84.0 }
    ];

    const evalSeeds = [];
    const quantSeeds = [];

    // Repeat submissions for test coverage ("latest per evaluator")
    // SYS001: 90000001 has an older submission
    // SYS002: 90000002 has an older submission
    evalSeeds.push({
        id: 'mock-eval-SYS001-90000001-older',
        systemId: 'SYS001',
        userId: '90000001',
        submittedAt: '2026-04-15T09:00:00Z',
        beforeAnswers: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        afterAnswers: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
        beforeAverage: 4.0,
        afterAverage: 2.0,
        satisfactionAnswers: [2, 2, 2, 2, 2],
        satisfactionAverage: 2.0,
        userRole: 'teacher',
        feedback: 'ข้อมูลจำลองรายการก่อนหน้าสำหรับทดสอบการเลือก submission ล่าสุด'
    });

    quantSeeds.push({
        id: 'mock-quant-SYS001-90000001-older',
        systemId: 'SYS001',
        userId: '90000001',
        submittedAt: '2026-04-15T09:00:00Z',
        values: {
            accept_time: { status: 'known', before: 21.56, after: 28.03 },
            done_time: { status: 'known', before: 5.88, after: 7.64 },
            on_time: { status: 'known', before: 62.72, after: 43.9 },
            complete_first: { status: 'known', before: 60.76, after: 42.53 },
            repeat: { status: 'known', before: 13.72, after: 17.84 },
            lost: { status: 'known', before: 4.41, after: 5.73 },
            sat_requester: { status: 'known', before: 3.14, after: 2.2 },
            sat_staff: { status: 'known', before: 3.23, after: 2.26 },
            requester_minutes: { status: 'known', before: 17.64, after: 22.93 },
            staff_minutes: { status: 'known', before: 24.5, after: 31.85 },
            cost_per_case: { status: 'known', before: 117.6, after: 152.88 }
        }
    });

    for (const sysId of systemIds) {
        const cfg = systemConfig[sysId];
        if (!cfg) continue;

        // 1. Effectiveness Records
        if (cfg.nEff > 0) {
            // Pick nEff unique users
            const effUserPool = shuffle(users).slice(0, cfg.nEff);
            const dates = generateDates(cfg.nEff, sysId.charCodeAt(5) || 1);

            // Generate mean-preserving perturbations delta for n users: sum(deltas) = 0
            const rawDeltas = [];
            for (let i = 0; i < cfg.nEff; i++) {
                rawDeltas.push((rng() - 0.5) * 0.2); // +/- 10%
            }
            const meanDelta = rawDeltas.reduce((a, b) => a + b, 0) / cfg.nEff;
            const deltas = rawDeltas.map(d => d - meanDelta);

            effUserPool.forEach((user, idx) => {
                const delta = deltas[idx];
                const mult = 1 + delta;
                const recordId = `mock-quant-${sysId}-${user.id}-latest`;
                const submittedAt = dates[idx];

                const values = {};
                for (const m of baseMetricDefs) {
                    if (cfg.mode === 'preliminary') {
                        // SYS016: only first 7 metrics known, last 4 unknown (coverage = 70)
                        if (['sat_staff', 'requester_minutes', 'staff_minutes', 'cost_per_case'].includes(m.id)) {
                            values[m.id] = { status: 'unknown', before: null, after: null };
                            continue;
                        }
                    }

                    let bVal, aVal;
                    if (cfg.mode === 'similar') {
                        bVal = Math.round(m.baseBefore * mult * 100) / 100;
                        aVal = bVal; // before == after
                    } else if (cfg.mode === 'before-better') {
                        // After is worse than before
                        bVal = Math.round(m.baseBefore * mult * 100) / 100;
                        aVal = Math.round(m.baseBefore * mult * 1.3 * 100) / 100; // 30% worse
                        if (m.direction === 'increase') {
                            aVal = Math.round(m.baseBefore * mult * 0.7 * 100) / 100; // 30% lower
                        }
                    } else {
                        // after-better (good or preliminary)
                        bVal = Math.round(m.baseBefore * mult * 100) / 100;
                        aVal = Math.round(m.baseAfter * mult * 100) / 100;
                    }
                    values[m.id] = { status: 'known', before: bVal, after: aVal };
                }

                quantSeeds.push({
                    id: recordId,
                    systemId: sysId,
                    userId: user.id,
                    submittedAt,
                    values
                });
            });
        }

        // 2. Satisfaction Records (evaluations + satisfactions)
        if (cfg.nSat > 0) {
            // Pick nSat unique users (independent sample from users)
            const satUserPool = shuffle(users).slice(0, cfg.nSat);
            const dates = generateDates(cfg.nSat, (sysId.charCodeAt(5) || 1) + 7);

            // Likert answer templates per tier
            // high (good): avg ~ 4.4 - 4.6 (>= 3.41)
            const highTemplates = [
                [4, 4, 4, 5, 4], // 4.2
                [5, 4, 4, 5, 4], // 4.4
                [5, 5, 4, 5, 4], // 4.6
                [5, 5, 5, 4, 5], // 4.8
                [4, 5, 5, 5, 4], // 4.6
                [5, 4, 5, 4, 5], // 4.6
                [4, 4, 5, 4, 5]  // 4.4
            ];
            // moderate (watch): avg ~ 3.2 - 3.4 (2.61 <= avg < 3.41)
            const modTemplates = [
                [3, 3, 3, 3, 3], // 3.0
                [3, 3, 3, 4, 3], // 3.2
                [3, 3, 4, 3, 4], // 3.4
                [4, 3, 4, 3, 4], // 3.6
                [3, 4, 3, 3, 3], // 3.2
                [3, 3, 3, 3, 4], // 3.2
                [4, 3, 3, 4, 3]  // 3.4
            ];
            // low (improve): avg ~ 2.1 - 2.4 (< 2.61)
            const lowTemplates = [
                [2, 2, 2, 2, 2], // 2.0
                [2, 2, 3, 2, 2], // 2.2
                [2, 3, 2, 3, 2], // 2.4
                [3, 2, 3, 2, 3], // 2.6
                [2, 2, 2, 3, 2], // 2.2
                [2, 3, 2, 2, 2]  // 2.2
            ];

            const pool = cfg.satTier === 'high' ? highTemplates : cfg.satTier === 'moderate' ? modTemplates : lowTemplates;

            satUserPool.forEach((user, idx) => {
                const answers = pool[idx % pool.length];
                const avg = Math.round((answers.reduce((a, b) => a + b, 0) / answers.length) * 100) / 100;
                const recordId = `mock-eval-${sysId}-${user.id}-latest`;
                const submittedAt = dates[idx];

                // Survey before/after likert answers (10 items)
                let bAnswers = [];
                let aAnswers = [];
                let bAvg = null;
                let aAvg = null;

                if (cfg.mode !== 'none') {
                    if (cfg.mode === 'before-better') {
                        bAnswers = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
                        aAnswers = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
                        bAvg = 4.0;
                        aAvg = 3.0;
                    } else if (cfg.mode === 'similar') {
                        bAnswers = [3, 4, 3, 4, 3, 4, 3, 4, 3, 4];
                        aAnswers = [3, 4, 3, 4, 3, 4, 3, 4, 3, 4];
                        bAvg = 3.5;
                        aAvg = 3.5;
                    } else {
                        // after-better
                        bAnswers = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
                        aAnswers = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
                        bAvg = 3.0;
                        aAvg = 4.0;
                    }
                }

                evalSeeds.push({
                    id: recordId,
                    systemId: sysId,
                    userId: user.id,
                    submittedAt,
                    beforeAnswers: bAnswers,
                    afterAnswers: aAnswers,
                    beforeAverage: bAvg,
                    afterAverage: aAvg,
                    satisfactionAnswers: answers,
                    satisfactionAverage: avg,
                    userRole: user.role,
                    feedback: 'ข้อมูลจำลองสำหรับทดสอบรายงาน'
                });
            });
        }
    }

    return {
        users,
        evalSeeds,
        quantSeeds,
        userMap
    };
}

// Convert dataset to full in-memory objects compatible with EffectivenessScoring and AdminOverviewModel
function convertToModels(dataset, systems) {
    const quantRecords = dataset.quantSeeds.map(q => {
        const user = dataset.userMap.get(q.userId);
        return {
            id: q.id,
            userId: q.userId,
            systemId: q.systemId,
            submittedAt: q.submittedAt,
            profile: { id: q.userId, name: user?.displayName, role: user?.role },
            config: {
                kpiSchema: 1,
                metrics: EffectivenessExamples.metrics.map(m => ({
                    id: m.id,
                    name: m.name.th,
                    unit: m.unit.th,
                    direction: m.direction,
                    weight: m.weight,
                    active: true,
                    required: true
                }))
            },
            values: q.values
        };
    });

    const evaluations = dataset.evalSeeds.map(e => ({
        id: e.id,
        systemId: e.systemId,
        systemName: e.systemId,
        evaluatorId: e.userId,
        evaluatorName: dataset.userMap.get(e.userId)?.displayName || e.userId,
        userRole: e.userRole,
        beforeAnswers: e.beforeAnswers,
        afterAnswers: e.afterAnswers,
        beforeAverage: e.beforeAverage,
        afterAverage: e.afterAverage,
        comparableCount: e.beforeAnswers.length,
        satisfactionAnswers: e.satisfactionAnswers,
        satisfactionAverage: e.satisfactionAverage,
        feedback: e.feedback,
        submittedAt: e.submittedAt
    }));

    const model = AdminOverviewModel.compute(systems, quantRecords, evaluations);
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
    const computedStatuses = {};
    for (const r of ranked) {
        computedStatuses[r.systemId] = r;
    }
    return { quantRecords, evaluations, model, ranked, computedStatuses };
}

// Generate the SQL script string
function generateSql(dataset) {
    const lines = [];
    lines.push('-- Deterministic development-only mock data for the 21 existing systems (10-20 evaluators/system).');
    lines.push('-- Re-running this file replaces only rows marked with mock-* / mock_* markers.');
    lines.push('-- Password hashes and salts are random independent values; mock users have no usable credentials.');
    lines.push('PRAGMA foreign_keys = ON;');
    lines.push('BEGIN IMMEDIATE;');
    lines.push("DELETE FROM assessment_answers WHERE evaluation_id IN (SELECT id FROM evaluations WHERE id GLOB 'mock-eval-*');");
    lines.push("DELETE FROM satisfactions WHERE evaluation_id GLOB 'mock-eval-*';");
    lines.push("DELETE FROM evaluations WHERE id GLOB 'mock-eval-*';");
    lines.push("DELETE FROM quantitative_records WHERE id GLOB 'mock-quant-*';");
    lines.push("DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM users WHERE username GLOB 'mock_*');");
    lines.push("DELETE FROM users WHERE username GLOB 'mock_*';");
    lines.push('');
    lines.push('-- Mock accounts are synthetic; no password is supplied or known.');
    lines.push('INSERT INTO users(id,username,display_name,role,password_hash,password_salt,password_iterations) VALUES');

    const userSqlLines = dataset.users.map((u, i) => {
        const comma = i === dataset.users.length - 1 ? ';' : ',';
        return `('${u.id}','${u.username}','${u.displayName}','${u.role}','${u.hash}','${u.salt}',${u.iter})${comma}`;
    });
    lines.push(userSqlLines.join('\n'));
    lines.push('');

    // mock_eval_seed
    lines.push('CREATE TEMP TABLE mock_eval_seed (id TEXT PRIMARY KEY,system_id TEXT NOT NULL,user_id TEXT NOT NULL,submitted_at TEXT NOT NULL,before_answers TEXT NOT NULL,after_answers TEXT NOT NULL,before_average REAL,after_average REAL,satisfaction_answers TEXT NOT NULL,satisfaction_average REAL,user_role TEXT NOT NULL,feedback TEXT NOT NULL);');
    lines.push('INSERT INTO mock_eval_seed VALUES');
    const evalSqlLines = dataset.evalSeeds.map((e, i) => {
        const comma = i === dataset.evalSeeds.length - 1 ? ';' : ',';
        const bAvg = e.beforeAverage === null ? 'NULL' : e.beforeAverage;
        const aAvg = e.afterAverage === null ? 'NULL' : e.afterAverage;
        const bAns = JSON.stringify(e.beforeAnswers);
        const aAns = JSON.stringify(e.afterAnswers);
        const sAns = JSON.stringify(e.satisfactionAnswers);
        return `('${e.id}','${e.systemId}','${e.userId}','${e.submittedAt}','${bAns}','${aAns}',${bAvg},${aAvg},'${sAns}',${e.satisfactionAverage},'${e.userRole}','${e.feedback}')${comma}`;
    });
    lines.push(evalSqlLines.join('\n'));
    lines.push('');

    lines.push("INSERT INTO evaluations(id,system_id,system_name,evaluator_id,evaluator_name,user_role,before_answers,after_answers,before_average,after_average,comparable_count,feedback,submitted_at) SELECT s.id,s.system_id,sys.name,s.user_id,u.display_name,s.user_role,s.before_answers,s.after_answers,s.before_average,s.after_average,CASE WHEN json_array_length(s.before_answers)>0 THEN 10 ELSE 0 END,s.feedback,s.submitted_at FROM mock_eval_seed s JOIN systems sys ON sys.id=s.system_id JOIN users u ON u.id=s.user_id;");
    lines.push("INSERT INTO satisfactions(evaluation_id,answers,average) SELECT id,satisfaction_answers,satisfaction_average FROM mock_eval_seed WHERE json_array_length(satisfaction_answers)>0;");
    lines.push("INSERT INTO assessment_answers(evaluation_id,question_id,assessment_type,phase,question_text,answer_value) SELECT e.id,q.id,'effectiveness','before',q.text,CAST(json_extract(e.before_answers,'$['||(q.sort_order-1)||']') AS TEXT) FROM evaluations e JOIN assessment_questions q ON q.system_id=e.system_id AND q.assessment_type='effectiveness' AND q.active=1 WHERE e.id GLOB 'mock-eval-*' AND q.sort_order<=json_array_length(e.before_answers);");
    lines.push("INSERT INTO assessment_answers(evaluation_id,question_id,assessment_type,phase,question_text,answer_value) SELECT e.id,q.id,'effectiveness','after',q.text,CAST(json_extract(e.after_answers,'$['||(q.sort_order-1)||']') AS TEXT) FROM evaluations e JOIN assessment_questions q ON q.system_id=e.system_id AND q.assessment_type='effectiveness' AND q.active=1 WHERE e.id GLOB 'mock-eval-*' AND q.sort_order<=json_array_length(e.after_answers);");
    lines.push("INSERT INTO assessment_answers(evaluation_id,question_id,assessment_type,phase,question_text,answer_value) SELECT e.id,q.id,'satisfaction','submitted',q.text,CAST(json_extract(s.answers,'$['||(q.sort_order-1)||']') AS TEXT) FROM evaluations e JOIN satisfactions s ON s.evaluation_id=e.id JOIN assessment_questions q ON q.system_id=e.system_id AND q.assessment_type='satisfaction' AND q.active=1 WHERE e.id GLOB 'mock-eval-*' AND q.sort_order<=json_array_length(s.answers);");
    lines.push('');

    // mock_quant_seed
    lines.push('CREATE TEMP TABLE mock_quant_seed (id TEXT PRIMARY KEY,system_id TEXT NOT NULL,user_id TEXT NOT NULL,submitted_at TEXT NOT NULL,values_json TEXT NOT NULL);');
    lines.push('INSERT INTO mock_quant_seed VALUES');
    const quantSqlLines = dataset.quantSeeds.map((q, i) => {
        const comma = i === dataset.quantSeeds.length - 1 ? ';' : ',';
        const valJson = JSON.stringify(q.values);
        return `('${q.id}','${q.systemId}','${q.userId}','${q.submittedAt}','${valJson}')${comma}`;
    });
    lines.push(quantSqlLines.join('\n'));
    lines.push('');

    lines.push("INSERT INTO quantitative_records(id,user_id,system_id,record_json,submitted_at) SELECT q.id,q.user_id,q.system_id,json_object('id',q.id,'userId',q.user_id,'step',2,'profile',json_object('id',q.user_id,'name',u.display_name,'role',u.role,'department','ข้อมูลจำลอง'),'systemId',q.system_id,'config',json_object('kpiSchema',1,'before',json('[{\"id\":\"mock-before-1\",\"name\":\"รับและบันทึกคำขอผ่านช่องทางเดิม\",\"active\":true,\"timed\":true},{\"id\":\"mock-before-2\",\"name\":\"ส่งต่อให้ผู้รับผิดชอบตรวจสอบ\",\"active\":true,\"timed\":true},{\"id\":\"mock-before-3\",\"name\":\"ตรวจสอบและแจ้งผล\",\"active\":true,\"timed\":true}]'),'after',json('[{\"id\":\"mock-after-1\",\"name\":\"ส่งคำขอผ่านระบบสารสนเทศ\",\"active\":true,\"timed\":true},{\"id\":\"mock-after-2\",\"name\":\"ติดตามและดำเนินงานในระบบ\",\"active\":true,\"timed\":true},{\"id\":\"mock-after-3\",\"name\":\"บันทึกผลและแจ้งผู้ใช้ผ่านระบบ\",\"active\":true,\"timed\":true}]'),'metrics',json('[{\"id\":\"accept_time\",\"name\":\"เวลารับเรื่อง\",\"unit\":\"ชั่วโมง\",\"basis\":\"ต่อคำขอ\",\"direction\":\"decrease\",\"weight\":8,\"source\":\"development-mock\",\"active\":true,\"required\":true},{\"id\":\"done_time\",\"name\":\"เวลาดำเนินการเสร็จ\",\"unit\":\"วัน\",\"basis\":\"ต่อคำขอ\",\"direction\":\"decrease\",\"weight\":12,\"source\":\"development-mock\",\"active\":true,\"required\":true},{\"id\":\"on_time\",\"name\":\"งานเสร็จตามกำหนด\",\"unit\":\"%\",\"basis\":\"ต่อคำขอ\",\"direction\":\"increase\",\"weight\":10,\"source\":\"development-mock\",\"active\":true,\"required\":true},{\"id\":\"complete_first\",\"name\":\"ข้อมูลครบถ้วนตั้งแต่ส่งคำขอครั้งแรก\",\"unit\":\"%\",\"basis\":\"ต่อคำขอ\",\"direction\":\"increase\",\"weight\":8,\"source\":\"development-mock\",\"active\":true,\"required\":true},{\"id\":\"repeat\",\"name\":\"งานที่ต้องส่งคำขอซ้ำ\",\"unit\":\"%\",\"basis\":\"ต่อคำขอ\",\"direction\":\"decrease\",\"weight\":9,\"source\":\"development-mock\",\"active\":true,\"required\":true},{\"id\":\"lost\",\"name\":\"คำขอสูญหายหรือส่งผิดหน่วย\",\"unit\":\"%\",\"basis\":\"ต่อคำขอ\",\"direction\":\"decrease\",\"weight\":8,\"source\":\"development-mock\",\"active\":true,\"required\":true},{\"id\":\"sat_requester\",\"name\":\"ความพึงพอใจของผู้ส่งคำขอ\",\"unit\":\"1–5\",\"basis\":\"ต่อคำขอ\",\"direction\":\"increase\",\"weight\":15,\"source\":\"development-mock\",\"active\":true,\"required\":true},{\"id\":\"sat_staff\",\"name\":\"ความพึงพอใจของผู้ดำเนินการและเจ้าหน้าที่\",\"unit\":\"1–5\",\"basis\":\"ต่อคำขอ\",\"direction\":\"increase\",\"weight\":10,\"source\":\"development-mock\",\"active\":true,\"required\":true},{\"id\":\"requester_minutes\",\"name\":\"เวลาที่ผู้ส่งคำขอใช้ต่อครั้ง\",\"unit\":\"นาที\",\"basis\":\"ต่อคำขอ\",\"direction\":\"decrease\",\"weight\":5,\"source\":\"development-mock\",\"active\":true,\"required\":true},{\"id\":\"staff_minutes\",\"name\":\"เวลาจัดการเอกสารของเจ้าหน้าที่ต่อเรื่อง\",\"unit\":\"นาที\",\"basis\":\"ต่อคำขอ\",\"direction\":\"decrease\",\"weight\":7,\"source\":\"development-mock\",\"active\":true,\"required\":true},{\"id\":\"cost_per_case\",\"name\":\"ต้นทุนรวมต่อเรื่อง\",\"unit\":\"บาท\",\"basis\":\"ต่อคำขอ\",\"direction\":\"decrease\",\"weight\":8,\"source\":\"development-mock\",\"active\":true,\"required\":true}]')),'values',json(q.values_json),'submittedAt',q.submitted_at,'kind','quantitative'),q.submitted_at FROM mock_quant_seed q JOIN users u ON u.id=q.user_id;");
    lines.push('DROP TABLE mock_eval_seed;');
    lines.push('DROP TABLE mock_quant_seed;');
    lines.push('COMMIT;');
    lines.push('');

    return lines.join('\n');
}

// Verification against baseline
function validateDataset(computedStatuses, baselineStatuses) {
    const errors = [];
    for (const [sysId, base] of Object.entries(baselineStatuses)) {
        const computed = computedStatuses[sysId];
        if (!computed) {
            errors.push(`Missing computed status for ${sysId}`);
            continue;
        }

        // 1. Status must match exactly
        if (computed.status !== base.status) {
            errors.push(`${sysId} status mismatch: expected ${base.status}, got ${computed.status}`);
        }

        // 2. Summary must match exactly
        const compSummary = computed.effectiveness ? computed.effectiveness.summary : 'no-data';
        if (compSummary !== base.summary) {
            errors.push(`${sysId} summary mismatch: expected ${base.summary}, got ${compSummary}`);
        }

        // 3. Preliminary flag must match exactly
        if (computed.preliminary !== base.preliminary) {
            errors.push(`${sysId} preliminary mismatch: expected ${base.preliminary}, got ${computed.preliminary}`);
        }

        // 4. Satisfaction average range check
        if (base.satisfactionAverage === null) {
            if (computed.satisfactionAverage !== null) {
                errors.push(`${sysId} satisfactionAverage expected null, got ${computed.satisfactionAverage}`);
            }
        } else if (base.satisfactionAverage < 2.61) {
            if (!(computed.satisfactionAverage < 2.61)) {
                errors.push(`${sysId} satAvg expected < 2.61, got ${computed.satisfactionAverage}`);
            }
        } else if (base.satisfactionAverage < 3.41) {
            if (!(computed.satisfactionAverage >= 2.61 && computed.satisfactionAverage < 3.41)) {
                errors.push(`${sysId} satAvg expected [2.61, 3.41), got ${computed.satisfactionAverage}`);
            }
        } else {
            if (!(computed.satisfactionAverage >= 3.41)) {
                errors.push(`${sysId} satAvg expected >= 3.41, got ${computed.satisfactionAverage}`);
            }
        }

        // 5. Evaluator count check (10-20 for active systems, 0 for SYS019/SYS020/SYS017sat/SYS018eff)
        const nEff = computed.effectiveness ? computed.effectiveness.n : 0;
        const nSat = computed.satisfaction ? computed.satisfaction.n : 0;

        if (sysId === 'SYS019' || sysId === 'SYS020') {
            if (nEff !== 0 || nSat !== 0) errors.push(`${sysId} should have 0 evaluators, got eff=${nEff}, sat=${nSat}`);
        } else if (sysId === 'SYS017') {
            if (nEff < 10 || nEff > 20) errors.push(`${sysId} eff evaluators should be 10-20, got ${nEff}`);
            if (nSat !== 0) errors.push(`${sysId} sat evaluators should be 0, got ${nSat}`);
        } else if (sysId === 'SYS018') {
            if (nEff !== 0) errors.push(`${sysId} eff evaluators should be 0, got ${nEff}`);
            if (nSat < 10 || nSat > 20) errors.push(`${sysId} sat evaluators should be 10-20, got ${nSat}`);
        } else {
            if (nEff < 10 || nEff > 20) errors.push(`${sysId} eff evaluators should be 10-20, got ${nEff}`);
            if (nSat < 10 || nSat > 20) errors.push(`${sysId} sat evaluators should be 10-20, got ${nSat}`);
        }
    }
    return errors;
}

if (require.main === module) {
    const dbPath = path.resolve(__dirname, '../evaluator.db');
    const baselinePath = path.resolve(__dirname, 'baseline-statuses.json');
    const baselineStatuses = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

    const db = new DatabaseSync(dbPath);
    const systems = db.prepare('SELECT id, name, name_en, sort_order FROM systems WHERE active=1 ORDER BY sort_order, id').all();

    console.log('Generating deterministic mock dataset...');
    const dataset = generateMockDataset();
    console.log(`Generated ${dataset.users.length} users, ${dataset.evalSeeds.length} eval seeds, ${dataset.quantSeeds.length} quant seeds.`);

    const converted = convertToModels(dataset, systems);
    const errors = validateDataset(converted.computedStatuses, baselineStatuses);

    if (errors.length > 0) {
        console.error('Validation errors:', errors);
        process.exit(1);
    }
    console.log('All 21 systems validated successfully against baseline statuses!');

    // Generate SQL and write to mock-data.sql
    const sql = generateSql(dataset);
    const sqlPath = path.resolve(__dirname, 'mock-data.sql');
    fs.writeFileSync(sqlPath, sql, 'utf8');
    console.log(`Wrote ${sqlPath} (${sql.length} bytes).`);

    // Execute SQL on evaluator.db
    console.log('Executing mock-data.sql on database/evaluator.db...');
    db.exec(sql);

    // Run PRAGMA checks and VACUUM
    const integrity = db.prepare('PRAGMA integrity_check').all();
    const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
    const sessions = db.prepare('SELECT count(*) AS count FROM auth_sessions').all();

    console.log('PRAGMA integrity_check:', integrity);
    console.log('PRAGMA foreign_key_check:', fkCheck);
    console.log('auth_sessions count:', sessions[0].count);

    db.exec('VACUUM;');
    db.close();

    const stat = fs.statSync(dbPath);
    console.log(`evaluator.db updated. File size: ${stat.size} bytes.`);

    // Print summary comparison table
    console.table(Object.keys(baselineStatuses).map(sysId => {
        const base = baselineStatuses[sysId];
        const comp = converted.computedStatuses[sysId];
        return {
            sysId,
            status: `${base.status} -> ${comp.status}`,
            summary: `${base.summary} -> ${comp.effectiveness?.summary || 'no-data'}`,
            prelim: `${base.preliminary} -> ${comp.preliminary}`,
            nEff: `${base.nEffectiveness} -> ${comp.effectiveness?.n || 0}`,
            nSat: `${base.nSatisfaction} -> ${comp.satisfaction?.n || 0}`,
            effAfter: `${base.afterScore?.toFixed(1) ?? '—'} -> ${comp.effectivenessScore?.toFixed(1) ?? '—'}`,
            satAvg: `${base.satisfactionAverage?.toFixed(2) ?? '—'} -> ${comp.satisfactionAverage?.toFixed(2) ?? '—'}`
        };
    }));
}

module.exports = {
    mulberry32,
    generateMockUsers,
    generateDates,
    generateMockDataset,
    convertToModels,
    generateSql,
    validateDataset
};
