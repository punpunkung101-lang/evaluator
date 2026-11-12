#!/usr/bin/env node
'use strict';

// Read-only generator for docs/dashboard-calculation-*.md.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const scoring = require('../frontend/assets/js/admin/effectiveness-scoring.js');
const modelApi = require('../frontend/assets/js/admin/admin-overview-model.js');

const root = path.resolve(__dirname, '..');
const db = new DatabaseSync(path.join(root, 'database', 'evaluator.db'), { readOnly: true });
process.on('exit', () => { try { db.close(); } catch {} });
const parse = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
const systems = db.prepare('SELECT id,name,name_en,active,sort_order,has_tracking FROM systems WHERE active=1 ORDER BY sort_order,id').all().map(x => ({ ...x, active: Boolean(x.active), has_tracking: Boolean(x.has_tracking) }));
const evaluations = db.prepare(`SELECT e.id,e.system_id AS systemId,e.system_name AS systemName,e.assessment_type AS assessmentType,e.evaluator_id AS evaluatorId,e.respondent_role AS respondentRole,e.respondent_role_label AS respondentRoleLabel,e.profile_json,e.is_mock AS isMock,e.submitted_at AS submittedAt,a.question_id AS questionId,a.answer_json,a.score_value AS scoreValue,a.is_na AS isNa FROM evaluations e LEFT JOIN evaluation_answers a ON a.evaluation_id=e.id ORDER BY e.submitted_at DESC,a.id`).all();
const byEvaluation = new Map();
for (const row of evaluations) {
  let record = byEvaluation.get(row.id);
  if (!record) { record = { id: row.id, systemId: row.systemId, systemName: row.systemName, assessmentType: row.assessmentType, evaluatorId: row.evaluatorId, userId: row.evaluatorId, respondentRole: row.respondentRole, respondentRoleLabel: row.respondentRoleLabel, profile: parse(row.profile_json, {}), isMock: Boolean(row.isMock), submittedAt: row.submittedAt, answers: [] }; byEvaluation.set(row.id, record); }
  if (row.questionId) record.answers.push({ questionId: row.questionId, value: parse(row.answer_json, row.answer_json), scoreValue: row.scoreValue, isNa: Boolean(row.isNa) });
}
const allRows = [...byEvaluation.values()];
const systemsQuestions = db.prepare(`SELECT q.id,q.system_id AS systemId,q.assessment_type AS assessmentType,q.section,q.text,q.text_en AS text_en,q.answer_type,q.options_json,q.required,q.is_scored AS is_scored,q.indicator_group,q.step,q.question_order,q.roles_json,q.visible_when_json,q.allow_na,q.allow_other,q.max_select,q.active FROM assessment_forms f JOIN form_versions v ON v.id=f.current_version_id JOIN form_version_questions fq ON fq.form_version_id=v.id JOIN assessment_questions q ON q.id=fq.question_id WHERE f.system_id=? AND f.active=1 AND q.active=1 ORDER BY f.assessment_type,fq.step,fq.sort_order`);
const qMap = new Map();
for (const system of systems) for (const q of systemsQuestions.all(system.id)) {
  const item = { ...q, assessment_type: q.assessmentType, system_id: q.systemId, is_scored: Boolean(q.is_scored), options: parse(q.options_json, []).map(o => ({ ...o, exclusive: Boolean(o.exclusive) })), roles: parse(q.roles_json, []).map(x => typeof x === 'string' ? x : x.value || x.id || x.label), visible_when: parse(q.visible_when_json, {}) };
  const key = `${item.assessmentType}|${item.systemId ?? 'core'}|${item.id}`;
  if (!qMap.has(key)) qMap.set(key, item);
}
const questions = [...qMap.values()];
const setting = db.prepare("SELECT value_json FROM app_settings WHERE setting_key='improvement_scoring'").get();
const scoringConfig = setting ? parse(setting.value_json, {}).improvement || null : null;
const config = scoringConfig ? { improvement: scoringConfig } : {};
const model = modelApi.compute(systems, allRows, questions, scoring, config);
const fmt = x => Number.isFinite(x) ? x.toFixed(2) : 'ไม่มีข้อมูล';
const pct = x => `${(x * 100).toFixed(1)}%`;
const md = x => String(x ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const byId = new Map(model.systems.map(x => [x.system.id, x]));
const signalSettings = { ...scoring.DEFAULT_SCORING_CONFIG.improvement, ...(scoringConfig || {}) };
const signalText = { urgent: 'ควรปรับปรุงเร่งด่วน', review: 'ควรตรวจสอบเพิ่มเติม', strength: 'จุดแข็งควรรักษา', insufficient: 'ข้อมูลยังไม่เพียงพอ' };
const categoryNames = { usability: 'ความง่ายในการใช้งาน', efficiency: 'ประสิทธิภาพ', effectiveness: 'ประสิทธิผล', data_quality: 'ความถูกต้องของข้อมูล', tracking_transparency: 'การติดตามและความโปร่งใส', reliability: 'ความน่าเชื่อถือ', system_specific: 'หมวดเฉพาะระบบ', previous_experience: 'ประสบการณ์เดิม', profile: 'ข้อมูลผู้ตอบ', facts: 'ข้อเท็จจริงการใช้งาน', issues: 'ปัญหาที่พบ', improvements: 'สิ่งที่ต้องการปรับปรุง', feedback: 'ความคิดเห็น', uncategorized: 'ไม่ระบุหมวด' };
const categoryLabel = key => `${categoryNames[key] || 'หมวดอื่น'} (${key})`;
function latestForSystem(records) {
  const latest = new Map();
  for (const row of records) {
    const key = String(row.evaluatorId || row.userId || row.profile?.id || '');
    if (!key) continue;
    const previous = latest.get(key);
    if (!previous || (Date.parse(row.submittedAt || '') || 0) >= (Date.parse(previous.submittedAt || '') || 0)) latest.set(key, row);
  }
  return [...latest.values()];
}
const refs = {
 scoring: 'frontend/assets/js/admin/effectiveness-scoring.js', overviewModel: 'frontend/assets/js/admin/admin-overview-model.js', overview: 'frontend/assets/js/admin/admin-overview.js', results: 'frontend/assets/js/admin/system-results.js', charts: 'frontend/assets/js/admin/admin-charts.js'
};
function line(file, pattern) { const rows = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/); const i = rows.findIndex(x => x.includes(pattern)); return i < 0 ? '?' : String(i + 1); }
function ref(file, pattern) { return `${file}:${line(file, pattern)}`; }

function systemDoc() {
  const out = ['<!-- ไฟล์นี้ถูกสร้างอัตโนมัติ ห้ามแก้ด้วยมือ -->', '# วิธีคำนวณและความหมายของค่าบน Dashboard แยกตามระบบ', '', `สร้างจากฐานข้อมูลแบบอ่านอย่างเดียว ณ ${new Date().toISOString().slice(0,10)} และเรียกตัวคำนวณเดียวกับ Dashboard: [ไกด์กลาง](dashboard-calculation-guide.md)`, ''];
  for (const system of systems) {
    const item = byId.get(system.id);
    const effectRows = allRows.filter(r => r.systemId === system.id && r.assessmentType === 'effectiveness');
    const satRows = allRows.filter(r => r.systemId === system.id && r.assessmentType === 'satisfaction');
    const qs = questions.filter(q => q.systemId === system.id || q.system_id === system.id || q.indicator_group === 'core');
    const eq = qs.filter(q => q.assessmentType === 'effectiveness');
    const sq = qs.filter(q => q.assessmentType === 'satisfaction');
    const effect = scoring.summarizeEffectiveness(effectRows, eq);
    const sat = scoring.summarizeSatisfactionAssessment(satRows, sq).find(x => x.systemId === system.id);
    const sig = scoring.buildImprovementSignals(allRows, questions, systems, config).find(x => x.systemId === system.id);
    const chart = modelApi.prepareSystemCharts(effect, effectRows, eq, scoringConfig || scoring.DEFAULT_SCORING_CONFIG.improvement);
    const cats = Object.values(effect.categoryStats);
    const roles = [...new Set([...effectRows, ...satRows].map(r => r.respondentRoleLabel || r.respondentRole).filter(Boolean))];
    const questionGroups = new Map();
    for (const q of eq) { const k = q.section || q.indicator_group || 'uncategorized'; if (!questionGroups.has(k)) questionGroups.set(k, []); questionGroups.get(k).push(q); }
    out.push(`## ${system.id} — ${md(system.name)} (${md(system.name_en || system.name)})`, '', `- กลุ่มบทบาทผู้ตอบที่พบ: ${roles.length ? roles.map(md).join('、') : 'ไม่มีรายการคำตอบในฐานข้อมูล'}`, `- has_tracking: **${system.has_tracking ? 'true — ระบบมีหมวดติดตาม (tracking_transparency)' : 'false — ไม่แสดงหมวดติดตามจาก metadata นี้'}**`, `- ประสิทธิผล: รายการหลังเลือกคำตอบล่าสุดต่อผู้ตอบ ${effect.records} รายการ; n ผู้ตอบทั้งหมด ${effect.n}; ความพึงพอใจ n=${sat?.n || 0}`, '', '### คำถามที่นำมาคิด', '', '| หมวด (section) | จำนวนข้อที่นับคะแนน | Core / เฉพาะระบบ / ตามบทบาท | ข้อที่ไม่นับเป็นคะแนน |', '|---|---:|---|---|');
    if (!questionGroups.size) out.push('| ไม่มีหมวดคำถามที่นับคะแนน | 0 | — | — |');
    for (const [category, group] of questionGroups) {
      const scored = group.filter(q => q.answer_type === 'rating5' && q.is_scored === true);
      const unscored = group.filter(q => !(q.answer_type === 'rating5' && q.is_scored === true));
      const kind = q => `${q.indicator_group === 'core' ? 'Core' : 'เฉพาะระบบ'}${q.roles?.length ? `; จำกัดบทบาท ${q.roles.join(', ')}` : ''}`;
      out.push(`| ${md(categoryLabel(category))} | ${scored.length} | ${[...new Set(scored.map(kind))].join('; ') || '—'} | ${unscored.map(q => `${md(q.id)} (${md(q.text)})`).join('<br>') || 'ไม่มีในหมวดนี้'} |`);
    }
    out.push('', '### ค่าประสิทธิผลรายหมวด', '', '| หมวด | ค่าเฉลี่ย / 5 | n ผู้ตอบมีคะแนน | N/A | ระดับ |', '|---|---:|---:|---:|---|');
    if (!cats.length) out.push('| ไม่มีข้อมูลคะแนน | ไม่มีข้อมูล | 0 | 0 | — |');
    for (const c of cats) out.push(`| ${md(categoryLabel(c.section))} | ${fmt(c.average)} | ${c.n} | ${c.naCount} | ${c.levelLabel || '—'} |`);
    const example = cats.find(c => Number.isFinite(c.average));
    if (example) {
      const catQs = eq.filter(q => (q.section || q.indicator_group || 'uncategorized') === example.section);
      const qids = new Set(catQs.map(q => q.id));
      let sum = 0, count = 0;
      for (const record of latestForSystem(effectRows)) for (const answer of record.answers || []) if (qids.has(answer.questionId)) {
        const q = catQs.find(x => x.id === answer.questionId); const score = scoring.answerScore(answer, q); if (score.scored) { sum += score.value; count++; }
      }
      out.push('', `ตัวอย่าง **${md(categoryLabel(example.section))}**: คะแนนดิบที่นับได้รวม ${sum} จาก ${count} คำตอบที่ไม่ใช่ N/A; ${sum} ÷ ${count} = ${fmt(example.average)} (ปัดแสดง 2 ตำแหน่ง).`);
    } else out.push('', 'ตัวอย่างการหารคะแนนไม่มีให้แสดง เนื่องจากไม่มีคำตอบคะแนนที่ใช้ได้ในระบบนี้');
    out.push('', '### ความพึงพอใจ: Core S1–S4 และข้อเฉพาะระบบ', '', '| กลุ่ม/ข้อ | ค่าเฉลี่ย / 5 | n | N/A (ผู้ตอบที่มี N/A) |', '|---|---:|---:|---:|');
    const coreQs = sq.filter(q => q.indicator_group === 'core');
    for (const q of coreQs) { const stat = sat?.questionStats?.[q.id]; out.push(`| ${md(q.id)} — ${md(q.text)} | ${fmt(stat?.average)} | ${stat?.n || 0} | ${stat?.naCount || 0} |`); }
    for (const q of sq.filter(q => q.indicator_group === 'specific')) { const stat = sat?.questionStats?.[q.id]; out.push(`| เฉพาะระบบ ${md(q.id)} — ${md(q.text)} | ${fmt(stat?.average)} | ${stat?.n || 0} | ${stat?.naCount || 0} |`); }
    out.push(`| รวม Core และข้อเฉพาะ | ${fmt(sat?.average)} | ${sat?.n || 0} | ${sat?.overall?.naCount || 0} |`, '', '### สัญญาณและเงื่อนไขที่ตรวจ', '', `**ผล: ${signalText[sig.level]}**`, '', '| เงื่อนไข | ค่าที่พบ | เกณฑ์จริง | ผลตามเงื่อนไข |', '|---|---:|---:|---|', `| ประสิทธิผล n | ${effect.n} | อย่างน้อย ${signalSettings.minimumRespondents} | ${effect.n >= signalSettings.minimumRespondents ? 'ผ่าน' : 'ไม่ผ่าน'} |`, `| ความพึงพอใจ n | ${sat?.n || 0} | อย่างน้อย ${signalSettings.minimumRespondents} | ${(sat?.n || 0) >= signalSettings.minimumRespondents ? 'ผ่าน' : 'ไม่ผ่าน'} |`, `| จำนวนหมวดแกนหลักต่ำกว่า ${signalSettings.categoryLowBelow} | ${sig.lowCategories.length} (${sig.lowCategories.map(categoryLabel).join(', ') || 'ไม่มี'}) | เร่งด่วนเมื่อ ≥ ${signalSettings.urgentLowCategoryCount} และมีเงื่อนไขร่วม | ${sig.lowCategories.length ? 'พบหมวดต่ำ' : 'ไม่พบ'} |`, `| คำตอบคะแนน ≤ ${signalSettings.lowRatingAtOrBelow} | ${sig.factors.lowRatingCount}/${effect.ratingResponseCount} = ${pct(sig.lowRatingShare)} | ทบทวน ≥ ${pct(signalSettings.lowRatingShareForReview)}; เร่งด่วนร่วม ≥ ${pct(signalSettings.lowRatingShareForUrgent)} | ${sig.lowRatingShare >= signalSettings.lowRatingShareForReview ? 'ถึงเกณฑ์ทบทวน' : 'ไม่ถึงเกณฑ์ทบทวน'} |`, `| ปัญหาที่พบบ่อย | ${sig.commonProblem ? `${md(sig.commonProblem.label)} ${sig.commonProblem.count}/${effect.records} (${pct(sig.commonProblem.share)})` : 'ไม่มี'} | ทบทวน ≥ ${pct(signalSettings.commonProblemShareForReview)}; เร่งด่วนเฉพาะเงื่อนไขความพึงพอใจต่ำ ≥ ${pct(signalSettings.urgentProblemShare)} | ${sig.commonProblem && sig.commonProblem.share >= signalSettings.commonProblemShareForReview ? 'ถึงเกณฑ์ทบทวน' : 'ไม่ถึงเกณฑ์ทบทวน'} |`, `| สิ่งที่ต้องการปรับปรุง | ${sig.commonImprovement ? `${md(sig.commonImprovement.label)} ${sig.commonImprovement.count}/${effect.records} (${pct(sig.commonImprovement.share)})` : 'ไม่มี'} | ทบทวน ≥ ${pct(signalSettings.commonImprovementShareForReview)} | ${sig.commonImprovement && sig.commonImprovement.share >= signalSettings.commonImprovementShareForReview ? 'ถึงเกณฑ์ทบทวน' : 'ไม่ถึงเกณฑ์ทบทวน'} |`, `| ความพึงพอใจเฉลี่ย | ${fmt(sat?.average)} | ต่ำกว่า ${signalSettings.satisfactionLowBelow} | ${sat?.average != null && sat.average < signalSettings.satisfactionLowBelow ? 'ต่ำกว่าเกณฑ์' : 'ไม่ต่ำกว่าเกณฑ์/ไม่มีข้อมูล'} |`, '', `ลำดับประเมินคือ ตรวจเกณฑ์จำนวนผู้ตอบก่อน (ถ้าต่ำกว่าค่าขั้นต่ำจะเป็นข้อมูลไม่เพียงพอ); เมื่อผ่านแล้วจึงตรวจเงื่อนไขเร่งด่วนก่อน ตรวจสอบเพิ่มเติม และจุดแข็ง ดู [หัวข้อ E ในไกด์กลาง](dashboard-calculation-guide.md).`, '', '### ค่าที่ส่งให้กราฟทั้ง 3 แบบ', '', `1. **Stacked bar:** หมวด ${chart.categories.map(categoryLabel).map(md).join(', ') || 'ไม่มี'}; คะแนน 1–2 ${chart.low.map(x => `${x.toFixed(1)}%`).join(', ') || 'ไม่มี'}; คะแนน 3 ${chart.middle.map(x => `${x.toFixed(1)}%`).join(', ') || 'ไม่มี'}; คะแนน 4–5 ${chart.high.map(x => `${x.toFixed(1)}%`).join(', ') || 'ไม่มี'}; N/A ${chart.na.map(x => `${x.toFixed(1)}%`).join(', ') || 'ไม่มี'}.`, `2. **Pie:** ปัญหาที่เลือกและจำนวน: ${chart.problems.map(x => `${md(x.label)}=${x.count}`).join('; ') || 'ไม่มีข้อมูลให้วาดกราฟ'}.`, `3. **Column:** ค่าเฉลี่ยรายหมวด ${chart.averages.map(fmt).join(', ') || 'ไม่มีข้อมูล'}; ความพึงพอใจ ${fmt(sat?.average)}; เส้นเกณฑ์ ${chart.threshold}. Tooltip แสดง n รายหมวด ${chart.n.join(', ') || 'ไม่มี'} และ n ความพึงพอใจ ${sat?.n || 0}.`, '', `ข้อควรระวัง: ${effect.n === 0 ? 'ไม่มีผู้ตอบประสิทธิผล; ค่าเฉลี่ยว่าง, กราฟสัดส่วนเป็น 0%, pie ปัญหาไม่มีข้อมูล, column ไม่มีข้อมูล และสัญญาณเป็นข้อมูลไม่เพียงพอ.' : 'กราฟแท่งรายหมวดรวม N/A ในตัวหาร; pie นับการเลือกตัวเลือกไม่ซ้ำต่อผู้ตอบ; หมวดที่ไม่มีคำตอบจะไม่ปรากฏ.'} [รายละเอียดวิธีอ่าน](dashboard-calculation-guide.md)`, '', '---', '');
  }
  return out.join('\n');
}

function guideDoc() {
  const ex = model.systems.find(x => Object.values(x.effectiveness.categoryStats).some(c => Number.isFinite(c.average))) || model.systems[0];
  const cat = ex && Object.values(ex.effectiveness.categoryStats).find(c => Number.isFinite(c.average));
  const satExample = ex?.satisfaction;
  const overviewCharts = modelApi.prepareOverviewCharts(model, allRows, questions, scoringConfig || scoring.DEFAULT_SCORING_CONFIG.improvement);
  const exampleBands = overviewCharts.bands.find(x => x.id === ex?.system.id);
  const exampleProblem = ex?.signal?.commonProblem;
  const bands = scoring.DEFAULT_SCORING_CONFIG.interpretationBands.map(x => `${x.min}–${x.max}: ${x.label}`).join('; ');
  const lines = [
    '# วิธีคำนวณและความหมายของค่าบน Dashboard', '',
    '> เอกสารนี้อธิบายการทำงานที่พบในโค้ดปัจจุบันของหน้า admin overview และผลรายระบบ แหล่งข้อมูลและตัวเลขอ้างอิงระบบจริงสร้างแบบอ่านอย่างเดียวด้วย [สคริปต์สร้างเอกสาร](../scripts/generate-calculation-docs.cjs).', '',
    '## A. อภิธานค่าและป้ายบน Dashboard', '',
    '| ค่า/ป้าย | ความหมายและสูตรตามโค้ด | ตัวอย่างจากข้อมูลปัจจุบัน | ตัวคำนวณ/หน้า |', '|---|---|---|---|',
    `| ค่าเฉลี่ยรายหมวด | ผลรวมคะแนนจำนวนเต็ม 1–5 ที่ใช้ได้ ÷ จำนวนคำตอบที่ใช้ได้; N/A และค่าที่ไม่ใช่จำนวนเต็ม 1–5 ไม่เข้าเฉลี่ย | ${cat ? `${categoryLabel(cat.section)}: ${fmt(cat.average)} จาก n=${cat.n}, ${cat.responseCount} คำตอบ` : 'ยังไม่มีคะแนน'} | summarizeRatingRows → makeStats; system-results |`,
    `| “รายการ” ประสิทธิผลในสรุปรายระบบ | จำนวนการประเมินประสิทธิผลล่าสุดต่อผู้ตอบ หลังลบรายการซ้ำต่อระบบ/ผู้ตอบ | ${ex ? `${ex.system.id}: ${ex.effectiveness.records} รายการ` : 'ไม่มีข้อมูล'} | summarizeEffectiveness.records; system-results |`,
    `| ค่าเฉลี่ยรายข้อ / N/A รายข้อ | ใช้สูตรเดียวกับหมวด แต่กรองคำตอบของ question ID นั้น; คอลัมน์คือคำถาม, ค่าเฉลี่ย, n, N/A, ระดับ | ${ex && Object.values(ex.effectiveness.questionStats).find(q=>Number.isFinite(q.average)) ? `${fmt(Object.values(ex.effectiveness.questionStats).find(q=>Number.isFinite(q.average)).average)} / 5, n=${Object.values(ex.effectiveness.questionStats).find(q=>Number.isFinite(q.average)).n}` : 'ไม่มีคะแนนรายข้อ'} | questionStats; system-results แท็บประสิทธิผล |`,
    `| แยกตามบทบาท / ประสบการณ์เดิม | ตัวกรองกลุ่มตาม respondentRole หรือคำตอบ history_experience แล้วคำนวณหมวดและ n ซ้ำในกลุ่มนั้น; หน้าผลแสดงตาราง “แยกตามบทบาทผู้ตอบ” และ “เปรียบเทียบผู้เคยใช้ระบบเดิม” | ${ex ? `มี ${Object.keys(ex.effectiveness.byRole).length} บทบาท และ ${Object.keys(ex.effectiveness.byPriorUse).length} กลุ่มประสบการณ์` : 'ไม่มีข้อมูล'} | summarizeEffectiveness.byRole/byPriorUse; system-results |`,
    `| ค่าเฉลี่ยประสิทธิผลภาพรวม / 5 | ค่าเฉลี่ยแบบไม่ถ่วงน้ำหนักของค่าเฉลี่ยแต่ละหมวดที่มีค่า | ${ex ? `${ex.system.id}: ${fmt(ex.effectivenessAverage)} / 5` : 'ไม่มีข้อมูล'} | AdminOverviewModel.compute; admin-overview |`,
    `| ความรู้สึกผู้ใช้ / ความพึงพอใจ | ต่อผู้ตอบ หาค่าเฉลี่ยข้อ Core และข้อเฉพาะที่มีคะแนนก่อน แล้วเฉลี่ยค่าเฉลี่ยรายผู้ตอบ; คำตอบ N/A ไม่เข้าเฉลี่ย | ${satExample ? `${ex.system.id}: ${fmt(satExample.average)} / 5, n=${satExample.n}` : 'ไม่มีข้อมูล'} | averagePerSubmission, summarizeSatisfactionAssessment |`,
    `| “/ 5” | แสดงว่าคะแนนอยู่บนมาตราส่วน 1–5; ไม่ใช่จำนวนคำตอบ | ค่าข้างต้นแสดง ${cat ? `${fmt(cat.average)} / 5` : 'ไม่มีข้อมูล / 5'} | system-results.js และ admin-overview.js |`,
    `| n | จำนวนผู้ตอบไม่ซ้ำที่มีคะแนนใช้ได้ในหมวด/ข้อ; satisfaction n คือผู้ตอบที่มีคะแนนอย่างน้อยหนึ่งข้อในชุดนั้น; n ภาพรวมประสิทธิผลนับรายการล่าสุดต่อผู้ตอบแม้ไม่มีคะแนนที่ใช้ได้ | ${cat ? `${categoryLabel(cat.section)} มี n=${cat.n}` : 'ดูตารางระบบ'} | makeStats, summarizeRatingRows |`,
    `| N/A | จำนวนคำตอบที่ระบุ not applicable ในคำถาม rating ที่นับคะแนน; satisfaction นับผู้ตอบ/รายการที่มี N/A อย่างน้อยหนึ่งข้อในชุด | ${cat ? `${categoryLabel(cat.section)} N/A=${cat.naCount}` : 'ดูตารางระบบ'} | answerScore, averagePerSubmission |`,
    `| ระดับ น้อยที่สุด…มากที่สุด | ช่วงเฉลี่ยตามเกณฑ์ bands ด้านล่าง; ไม่มีคะแนนแสดง “—”/ไม่มีข้อมูล | ${bands} | interpretation, satisfactionLevel |`,
    `| สัดส่วนคำตอบ 1–2 | จำนวนคะแนน ≤2 ÷ คะแนนที่กราฟจัดเข้ากลุ่ม 1–2/3/4–5; overview ไม่รวม N/A | ${exampleBands ? `${ex.system.id}: 1–2 ${exampleBands.low.toFixed(1)}%, 3 ${exampleBands.middle.toFixed(1)}%, 4–5 ${exampleBands.high.toFixed(1)}%` : 'ดูกราฟระบบ'} | prepareOverviewCharts |`,
    `| ปัญหาที่พบมาก / สิ่งที่ต้องการปรับปรุง | ตัวเลือกที่ถูกเลือกจำนวนครั้งมากสุด; share = ผู้ตอบที่เลือก ÷ รายการล่าสุดประสิทธิผลในระบบ; ตัวเลือกซ้ำในคำตอบเดียวคิดครั้งเดียว | ${ex?.signal?.commonProblem ? `${ex.signal.commonProblem.label}: ${ex.signal.commonProblem.count} (${pct(ex.signal.commonProblem.share)})` : 'ไม่มีปัญหาที่นับได้'}; ${ex?.signal?.commonImprovement ? `${ex.signal.commonImprovement.label}: ${ex.signal.commonImprovement.count} (${pct(ex.signal.commonImprovement.share)})` : 'ไม่มีข้อเสนอที่นับได้'} | countSelections, buildImprovementSignals |`,
    `| การ์ดสัญญาณ 4 ระดับ | จำนวนระบบที่ได้ urgent/review/strength/insufficient | ${Object.entries(overviewCharts.levels).map(([k,v])=>`${signalText[k]} ${v}`).join('; ')} | AdminOverviewModel.compute, admin-overview |`,
    `| ตารางภาพรวม | คอลัมน์ระบบ, ค่าเฉลี่ยประสิทธิผล / 5 พร้อม n, ความพึงพอใจ / 5 พร้อม n และป้ายความรู้สึกผู้ใช้, ระดับสัญญาณ, เหตุผล | ${ex ? `${ex.system.id}: ${fmt(ex.effectivenessAverage)} / 5 (n=${ex.effectiveness.n}); satisfaction ${fmt(ex.satisfaction?.average)} / 5 (n=${ex.satisfaction?.n || 0})` : 'ไม่มีข้อมูล'} | admin-overview |`,
    `| ปัจจัยที่มีผลต่อสัญญาณ | แสดงชื่อปัญหา/ข้อเสนอที่มีค่าสูงสุดและ share ×100; ไม่มีตัวเลือกแสดง “ยังไม่มีข้อมูล” และ — | ${exampleProblem ? `${exampleProblem.label}: ${exampleProblem.count} คำตอบ, ${pct(exampleProblem.share)}` : 'ไม่มีข้อมูลปัญหา'} | buildImprovementSignals; system-results |`,
    `| ความพึงพอใจ Core S1–S4 และเฉพาะระบบ | ค่าเฉลี่ย / 5 และ n รายข้อ; ตารางแยกบทบาทแสดง Core, รวมข้อเฉพาะ และ n | ${satExample ? `S1 ${fmt(satExample.questionStats.S1?.average)} / 5, n=${satExample.questionStats.S1?.n || 0}` : 'ไม่มีข้อมูล'} | summarizeSatisfactionAssessment; system-results |`,
    '', '### ระดับคะแนน', '', `| ช่วง | ป้าย |`, '|---:|---|', ...scoring.DEFAULT_SCORING_CONFIG.interpretationBands.map(x => `| ${x.min}–${x.max} | ${x.label} |`),
    '', '## B. n, N/A และจำนวนรายการ', '',
    `- **รายหมวด/รายข้อประสิทธิผล:** n คือจำนวน respondent ID ไม่ซ้ำของคำตอบที่ได้คะแนนใช้ได้ ไม่ใช่จำนวนคำตอบทั้งหมด; responseCount ซึ่งไม่ได้แสดงในตารางคือจำนวนคำตอบที่ใช้ได้จริง. หากผู้ตอบเดียวให้คะแนนหลายข้อในหมวด n เพิ่มหนึ่ง แต่ responseCount เพิ่มตามข้อ. ตัวอย่าง ${cat ? `${cat.section} ใน ${ex.system.id} มี n=${cat.n} เพราะมีผู้ตอบไม่ซ้ำ ${cat.n} คนที่มีคะแนนใช้ได้ในหมวดนี้` : 'ดูตารางระบบ'}.`,
    '- **ค่าเฉลี่ยประสิทธิผลรวมในตาราง overview:** `effectiveness.n` มาจากผู้ตอบไม่ซ้ำในรายการล่าสุดของระบบ โดยไม่กำหนดว่าต้องมีคะแนนใช้ได้ จึงอาจไม่เท่ากับ n ทุกหมวด.',
    '- **ความพึงพอใจ:** ในแต่ละชุดคำถาม ระบบเฉลี่ยคะแนนที่ตอบได้ต่อผู้ตอบก่อน; n คือจำนวนผู้ตอบที่มีค่าเฉลี่ยต่อผู้ตอบในชุดนั้น. N/A คือจำนวนรายการผู้ตอบที่มี N/A อย่างน้อยหนึ่งข้อในชุด ไม่ใช่ผลรวมช่อง N/A.',
    '- **“รายการ” ในสรุปรายระบบ:** effectiveness.records คือจำนวนรายการล่าสุดต่อผู้ตอบหลัง dedupe; ความพึงพอใจ n คือจำนวนผู้ตอบที่มีคะแนนในชุดคำถาม. ทั้งคู่ไม่ใช่จำนวนแถวคำตอบรายข้อ.',
    `- รายการซ้ำใช้ข้อมูลล่าสุดต่อ system + respondent โดยเวลา submitted_at; หากเวลาเท่ากัน รายการที่พบทีหลังแทนรายการเดิม. respondent ID ใช้ evaluator_id/user_id/profile.id ตามลำดับ.`,
    `- ระดับตัวอย่างคะแนนมี minimumSample=${scoring.DEFAULT_SCORING_CONFIG.minimumSample} ซึ่งกำหนด lowSample ในตัวคำนวณ แต่หน้าผลไม่แสดงป้าย lowSample. สัญญาณ insufficient ใช้ minimumRespondents=${signalSettings.minimumRespondents} แยกกัน และต้องมี n ของทั้งประสิทธิผลและความพึงพอใจถึงเกณฑ์.`,
    '- คำถามที่ไม่ได้ตอบหรือไม่ถูกนำเข้าคำตอบไม่เพิ่ม n และไม่เพิ่ม N/A. ดู n รายระบบใน [ตาราง 21 ระบบ](dashboard-calculation-by-system.md).',
    '', '## C. เส้น เกณฑ์ Tooltip และป้ายกราฟ', '',
    `- **เส้นประกราฟ Column:** ใช้ค่า config categoryLowBelow ?? satisfactionLowBelow (ค่าเริ่มต้น ${signalSettings.categoryLowBelow}); เป็นเส้นอ้างอิง ไม่ได้เปลี่ยนคะแนนหรือระดับ. ข้อความบนกราฟมาจาก prepareOverviewCharts/prepareSystemCharts; หากตั้ง categoryLowBelow แล้ว เส้นใช้ค่านี้ก่อน satisfactionLowBelow.`,
    '- **Tooltip กราฟ Column overview:** แสดง series, ค่าเฉลี่ยสองตำแหน่ง / 5 และ n; effectivenessN คือ n ภาพรวมของประสิทธิผล ไม่ใช่ n ของแต่ละหมวด; satisfactionN คือ n ความพึงพอใจ.',
    '- **Tooltip กราฟ Column รายระบบ:** แสดงค่าเฉลี่ย / 5 และ n รายหมวด; แท่งความรู้สึกผู้ใช้ใช้ n ความพึงพอใจ.',
    '- **Tooltip กราฟ Stacked bar:** แสดงสัดส่วนแต่ละกลุ่มเป็นทศนิยมหนึ่งตำแหน่ง; ป้ายแกน X ปัดเป็นจำนวนเต็มเปอร์เซ็นต์. แท่งไม่มีตัวเลขซ้อนบนแท่ง (dataLabels ปิด).',
    '- **Pie overview:** ป้ายแสดงเปอร์เซ็นต์; tooltip แสดงจำนวนระบบ. **Pie รายระบบ:** tooltip แสดงจำนวนคำตอบที่เลือก; ชิ้นวงกลมแสดงสัดส่วนจากจำนวนที่ป้อน.',
    '- **ระดับสัญญาณ:** ป้ายสถานะและการ์ดจำนวนสี่แบบ ไม่ใช่ระดับคะแนนเฉลี่ย; เหตุผลใต้สถานะอธิบายตัวกระตุ้นที่พบ.',
    '- **ป้าย mock:** ปรากฏเมื่อมีรายการ isMock หรือ id ขึ้นต้น mock- บอกว่าข้อมูลตัวอย่าง ไม่ใช่ผลจริง.',
    '', '## D. วิธีคำนวณค่าเฉลี่ยรายหมวด', '',
    '1. Dashboard โหลดคำถามจากแบบประเมินที่ active และเวอร์ชันปัจจุบัน; Core ใช้ร่วม ส่วนคำถามเฉพาะผูกกับระบบ. คำถาม rating5 ที่ is_scored=true เท่านั้นเข้าตัวคำนวณคะแนน.',
    '2. รวมคำตอบจากรายการล่าสุดต่อผู้ตอบและระบบ. จัดกลุ่มประสิทธิผลด้วย section; หากไม่มี section ใช้ indicator_group และหากไม่มีทั้งคู่ใช้ uncategorized.',
    '3. answerScore ตัด N/A (`isNa`/`is_na`, value `na`/`N/A`) ออก; รับเฉพาะจำนวนเต็ม 1–5. Dropdown, checkbox, ข้อความปลายเปิด และ rating ที่ไม่ตั้ง is_scored ไม่นับคะแนน.',
    '4. ค่าเฉลี่ยหมวด = ผลรวมคะแนนรายคำตอบ ÷ จำนวนคะแนนรายคำตอบที่ผ่าน; n = respondent ID ไม่ซ้ำในคะแนนเหล่านั้น; ระดับคำนวณจากค่าเฉลี่ยที่ยังไม่ปัดเศษ; UI ปัดแสดงสองตำแหน่ง.',
    `5. กลุ่มระดับ: ${bands}. ขอบเขตเป็นช่วงตาม config; ค่าเฉลี่ยที่อยู่ในช่องว่างระหว่างช่วงไม่ถูกจัดระดับ เพราะตัวคำนวณไม่ปัดก่อนจัดระดับ.`,
    '6. satisfaction ทำคนละลำดับ: เฉลี่ยข้อที่มีคะแนนในแต่ละผู้ตอบก่อน แล้วเฉลี่ยค่าเฉลี่ยผู้ตอบ จึงให้น้ำหนักผู้ตอบเท่ากัน แม้จำนวนข้อที่ตอบได้ต่างกัน.',
    '', '## E. สัญญาณ “ควรปรับปรุง”', '',
    'ตัวตั้งต้นมาจาก DEFAULT_SCORING_CONFIG ใน `effectiveness-scoring.js`; ค่าปรับแต่งใน app_settings key `improvement_scoring` ทับค่าเริ่มต้นเดียวกันทุกระบบ. สัดส่วนเก็บเป็นทศนิยม 0–1.',
    '', '| เกณฑ์ | ค่าเริ่มต้น | ใช้ในการตรวจ |', '|---|---:|---|',
    ...Object.entries(signalSettings).map(([k,v]) => `| ${k === 'coreCategories' ? 'หมวดแกนหลักที่ตรวจ' : k} | ${Array.isArray(v) ? v.join(', ') : v} | ${({minimumRespondents:'ขั้นต่ำ n ของทั้งสองแบบประเมิน',categoryLowBelow:'หมวดแกนหลักเฉลี่ยต่ำกว่าเกณฑ์',satisfactionLowBelow:'ค่าเฉลี่ยความพึงพอใจต่ำกว่าเกณฑ์',lowRatingAtOrBelow:'คะแนนที่นับเป็นคะแนนต่ำ',lowRatingShareForReview:'สัดส่วนคะแนนต่ำเพื่อทบทวน',lowRatingShareForUrgent:'สัดส่วนคะแนนต่ำร่วมกับ satisfaction ต่ำเพื่อเร่งด่วน',commonProblemShareForReview:'สัดส่วนปัญหาพบบ่อยเพื่อทบทวน',commonImprovementShareForReview:'สัดส่วนข้อเสนอพบบ่อยเพื่อทบทวน',urgentLowCategoryCount:'จำนวนหมวดต่ำร่วมเงื่อนไขเร่งด่วน',urgentProblemShare:'ปัญหาร่วม satisfaction ต่ำเพื่อเร่งด่วน',coreCategories:'หมวดที่ใช้ตรวจเงื่อนไขคะแนนต่ำ'})[k] || 'ค่า config'} |`),
    '', '### ลำดับตัดสินตามโค้ด', '',
    '| ลำดับ | เงื่อนไข | ผล |', '|---:|---|---|',
    `| 1 | effect n < ${signalSettings.minimumRespondents} **หรือ** satisfaction n < ${signalSettings.minimumRespondents} | ข้อมูลยังไม่เพียงพอ (จบการตัดสิน) |`,
    `| 2 | (หมวดแกนหลักต่ำ ≥ ${signalSettings.urgentLowCategoryCount} และ [satisfaction ต่ำ **หรือ** สัดส่วนคะแนนต่ำ ≥ ${signalSettings.lowRatingShareForReview} **หรือ** ปัญหาพบบ่อย]) **หรือ** (satisfaction ต่ำและสัดส่วนคะแนนต่ำ ≥ ${signalSettings.lowRatingShareForUrgent}) **หรือ** (satisfaction ต่ำและปัญหาพบบ่อย ≥ ${signalSettings.urgentProblemShare}) | เร่งด่วน |`,
    `| 3 | พบหมวดต่ำ **หรือ** satisfaction ต่ำ **หรือ** สัดส่วนคะแนนต่ำ ≥ ${signalSettings.lowRatingShareForReview} **หรือ** ปัญหาพบบ่อย ≥ ${signalSettings.commonProblemShareForReview} **หรือ** ข้อเสนอพบบ่อย ≥ ${signalSettings.commonImprovementShareForReview} | ตรวจสอบเพิ่มเติม |`,
    '| 4 | ไม่มีเงื่อนไขข้างต้น | จุดแข็งควรรักษา |',
    '', 'คะแนนต่ำคือคะแนน ≤ lowRatingAtOrBelow ÷ คะแนนประสิทธิผลที่ใช้ได้ทั้งหมด; หมวดต่ำตรวจเฉพาะ coreCategories; frequent selection ใช้จำนวนผู้ตอบที่เลือกตัวเลือกต่อรายการล่าสุดประสิทธิผล. ตัวเลือก exclusive, problem_9 และ other ถูกยกเว้น; เสมอกันเรียง value ตามตัวอักษร. เมื่อหลายเหตุผลเกิดพร้อมกัน ระบบแสดงเหตุผลหลายข้อ แต่ระดับยึดลำดับ urgent → review → strength หลังผ่าน sample gate.', '',
    '| ระดับ | ระบบตัวอย่างจากข้อมูลนี้ | เหตุผลตามผลคำนวณ |', '|---|---|---|',
    ...['urgent','review','strength','insufficient'].map(level => { const x = model.systems.find(y => y.signal.level === level); return `| ${signalText[level]} | ${x ? `${x.system.id} ${md(x.system.name)}` : 'ไม่มีระบบใน snapshot ปัจจุบัน'} | ${x ? x.signal.reasons.map(r=>md(r.message)).join('; ') : 'ไม่มีตัวอย่างในข้อมูลที่อ่าน'} |`; }),
    '', '## F. กราฟทั้ง 3 แบบ', '',
    '### ภาพรวม 21 ระบบ', '',
    '1. **Stacked bar — สัดส่วนคะแนนตามระบบ:** แกน X เป็นเปอร์เซ็นต์, แกน Y เป็นระบบเรียง urgent → review → strength → insufficient และเรียงรหัสในระดับเดียวกัน. กลุ่มสี low/mid/high แทน 1–2/3/4–5. คำนวณจำนวนคะแนนในกลุ่มจากคำตอบ effectiveness rating5/is_scored ที่ valid แล้วหารด้วยจำนวนคะแนน valid; N/A ถูกตัดออก. สีใช้ tokens `--chart-level-1/3/5`. Tooltip เป็นเปอร์เซ็นต์หนึ่งตำแหน่ง; ไม่มี data label. ตัวอย่างอ่าน: แท่ง low 25% หมายถึงหนึ่งในสี่ของคะแนน valid อยู่ที่ 1–2. กลุ่มอาจรวมไม่เต็ม 100% หากข้อมูลที่ได้จาก browser/ข้อมูลต้นทางผิดรูปแบบ? โค้ดทำให้กลุ่มคะแนนทั้งหมดเป็น 100% เมื่อมีคะแนน valid; หากไม่มีคะแนนทุกกลุ่มเป็น 0%.',
    '2. **Pie — จำนวนระบบตามสัญญาณ:** ชิ้นวงกลมแทนจำนวนระบบ 4 ระดับ; สี low/mid/high/track ตามลำดับ urgent/review/strength/insufficient; data labels แสดงสัดส่วนและ tooltip จำนวนระบบ. ไม่ใช่สัดส่วนคำตอบ.',
    '3. **Column — ค่าเฉลี่ยเทียบความรู้สึกผู้ใช้:** X เป็นระบบ; Y คะแนน 0–5; series ค่าเฉลี่ยประสิทธิผล (เฉลี่ยค่าเฉลี่ยรายหมวดแบบไม่ถ่วงน้ำหนัก) และความพึงพอใจ. เส้นประเป็น threshold จาก config; tooltip มี n. หมวดไม่มีข้อมูลไม่สร้างแท่ง; ทั้งสอง series ว่างทั้งหมดแสดง empty state. สี effect/sat จาก tokens. ป้ายระบบเอียง -55°.',
    '', '### หน้ารายระบบ', '',
    '1. **Stacked bar — สัดส่วนคะแนนรายหมวด:** X เป็นเปอร์เซ็นต์; Y เป็นหมวดตามลำดับ categoryStats; กลุ่ม 1–2/3/4–5 และ N/A. คำนวณจากคำตอบของรายการล่าสุด; ตัวหารรวมคะแนน valid และ N/A. N/A จึงทำให้แถบคะแนนรวมต่ำกว่า 100% แล้วส่วน N/A เติมให้ครบเมื่อมีข้อมูล. สี low/mid/high/track. Tooltip เป็นเปอร์เซ็นต์หนึ่งตำแหน่ง; ไม่มี data labels.',
    '2. **Pie — ปัญหาที่เลือก:** ชิ้นแทนจำนวนการเลือกแต่ละปัญหาจาก respondents ล่าสุด; choices ซ้ำในหนึ่ง respondent นับครั้งเดียว; ยกเว้น exclusive/problem_9/other; tooltip แสดงจำนวนคำตอบ. การแสดงเป็นสัดส่วนของชุด counts ไม่ใช่ share ต่อผู้ตอบ (ข้อความหน้าแผงบอกสัดส่วน แต่ข้อมูลป้อนคือ counts). ไม่มีข้อมูลแล้วแสดง empty state.',
    '3. **Column — ค่าเฉลี่ยรายหมวดและความพึงพอใจ:** X เป็นหมวดและหมวดท้าย “ความพึงพอใจ · ความรู้สึกผู้ใช้”; Y 0–5; series effectiveness ต่อหมวดและ satisfaction เฉพาะแท่งท้าย. เส้น threshold config เดียวกับ overview; tooltip มี n ต่อหมวด/ความพึงพอใจ; ป้ายเอียง -35°. ค่า null ไม่สร้างแท่ง.',
    '', '## G. ข้อความอธิบายท้าย Dashboard และข้อจำกัด', '',
    'หน้า overview แสดงข้อความ “กราฟแสดงภาพรวม 21 ระบบ · ความพึงพอใจเป็นความรู้สึกผู้ใช้ ไม่ใช่สถิติระบบต้นทาง”; แสดงหัวข้อ “วิธีคำนวณและการอ่านกราฟ” และสรุปว่าคะแนนมาจาก rating 1–5 ไม่นับ N/A/คำถามปลายเปิด, แสดงระดับจาก bands, สัญญาณจาก sample/หมวดต่ำ/satisfaction/คะแนนต่ำ/ปัญหา/ข้อเสนอ, กราฟ 1–3 และข้อควรระวังเมื่อ n ต่ำ. หน้ารายระบบเพิ่ม “ความต่างระหว่างคะแนนเฉลี่ยกับสถิติระบบต้นทาง” และระบุว่ายังไม่มีข้อมูลจากระบบต้นทาง.',
    'คะแนนทั้งหมดเป็นคำตอบและการรับรู้ของผู้ใช้ ไม่ใช่ log, uptime, ปริมาณงาน หรือสถิติระบบจริง. ค่าเฉลี่ยเดียวซ่อนความแตกต่างรายหมวดและจำนวนผู้ตอบ จึงควรอ่านร่วมกับหมวด, n/N/A, ความพึงพอใจ, สัญญาณและเหตุผล. ค่า n ต่ำอาจแทนผู้ตอบน้อย; `lowSample` ใช้เกณฑ์ 5 แต่ไม่แสดงใน UI และสัญญาณ insufficient ใช้ขั้นต่ำอีกชุดหนึ่งจาก config.',
    '', '## H. ข้อสังเกตและข้อจำกัดจากโค้ด', '',
    '- overview คำนวณประสิทธิผลเฉลี่ยด้วยค่าเฉลี่ยไม่ถ่วงน้ำหนักของค่าเฉลี่ยรายหมวด แต่ตารางยังใช้ n ของผู้ตอบรวม; จึงไม่ควรตีความเหมือนเอาคะแนนทุกคำตอบมารวมแล้วหาร.',
    '- กราฟ stacked overview ตัด N/A ออกจากตัวหาร; กราฟรายระบบรวม N/A ในตัวหาร. เปอร์เซ็นต์สองหน้าจึงเทียบตรง ๆ ไม่ได้.',
    '- `answerScore` รับเฉพาะจำนวนเต็ม 1–5 แต่ฟังก์ชันเตรียมกราฟตรวจเพียงค่าตัวเลข finite ในช่วง 1–5; ค่าทศนิยมผิดรูปแบบอาจไม่ถูกนับในตาราง แต่ถูกจัดเข้ากลุ่ม high ในกราฟ.',
    '- ในแท็บประสิทธิผล UI อ่าน `role.average` และ `group.average` เพื่อแสดงค่าเฉลี่ยแยกบทบาท/ประสบการณ์เดิม แต่ summarizeEffectiveness คืนค่า categoryStats โดยไม่มี average ที่ระดับกลุ่ม; ค่าคอลัมน์เฉลี่ยจึงไม่มีข้อมูล แม้มีข้อมูล n/หมวดในกลุ่ม.',
    '- คำอธิบายกราฟ pie ปัญหารายระบบใช้คำว่าสัดส่วน แต่โค้ดส่งจำนวนการเลือกเป็น series และ tooltip แสดงจำนวน.',
    '- satisfaction N/A count นับหนึ่งต่อผู้ตอบที่มี N/A อย่างน้อยหนึ่งข้อในชุด; effectiveness N/A นับรายคำตอบ.',
    '- กลุ่มคำถามจัดตาม section; หมวดที่ไม่ได้อยู่ใน coreCategories ยังแสดงในตาราง/กราฟ แต่ไม่ถูกนำไปตรวจ “หมวดต่ำ” ของสัญญาณ.',
    '- project brief หัวข้อ 6.4 และ 7.1–7.3 ระบุจำนวนผู้ได้รับเชิญ/อัตราตอบ, การเปรียบเทียบหน่วยงานและช่วงเวลา, ส่งออก Excel/PDF และตัวชี้วัดหมวดสูงสุด/ต่ำสุด; หน้าภาพรวมและผลรายระบบที่อ่านในโค้ดไม่มีตัวเลขหรือองค์ประกอบเหล่านี้ จึงไม่อธิบายว่าเป็นค่าบน Dashboard ปัจจุบัน.',
    '- ในข้อมูล snapshot SYS001 หมวดประสบการณ์เดิม (previous_experience) มี n=11 เพราะมีผู้ตอบไม่ซ้ำ 11 คนที่มีคะแนน valid ในหมวดนี้ แม้มีรายการประสิทธิผลล่าสุด 15 รายการ; n ไม่ได้หมายถึงจำนวนรายการทั้งหมด.',
    '', '### จุดอ้างอิงโค้ด', '',
    `- เกณฑ์, answerScore, makeStats, summary และ signal: [${refs.scoring}](${`../${refs.scoring}`}) — บรรทัด ${line(refs.scoring,'const DEFAULT_SCORING_CONFIG')}`,
    `- การเตรียมกราฟ/overview model: [${refs.overviewModel}](${`../${refs.overviewModel}`}) — บรรทัด ${line(refs.overviewModel,'function prepareOverviewCharts')}`,
    `- UI overview และข้อความวิธีคำนวณ: [${refs.overview}](${`../${refs.overview}`}) — บรรทัด ${line(refs.overview,'<details class="admin-panel admin-method"')}`,
    `- UI ผลรายระบบ/ตาราง/สรุป: [${refs.results}](${`../${refs.results}`}) — บรรทัด ${line(refs.results,'function render(data, systemId)')}`,
    `- สีและชนิดกราฟ: [${refs.charts}](${`../${refs.charts}`}) — บรรทัด ${line(refs.charts,'async function renderOverview')}`,
    '', 'รายระบบที่มีตัวเลขและตัวอย่างคำนวณ: [dashboard-calculation-by-system.md](dashboard-calculation-by-system.md).', ''
  ];
  return lines.join('\n');
}

function generate() {
  if (systems.length !== 21 || systems.some((s, i) => s.id !== `SYS${String(i + 1).padStart(3,'0')}`)) throw new Error(`Expected SYS001–SYS021, got ${systems.map(s=>s.id).join(', ')}`);
  fs.writeFileSync(path.join(root, 'docs/dashboard-calculation-guide.md'), guideDoc(), 'utf8');
  fs.writeFileSync(path.join(root, 'docs/dashboard-calculation-by-system.md'), systemDoc(), 'utf8');
}
if (require.main === module) { try { generate(); console.log('Generated dashboard calculation docs (read-only DB access).'); } finally { db.close(); } }
module.exports = { generate, systemDoc, guideDoc };
