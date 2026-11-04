(function(root) {
    'use strict';
    const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
    const dimensionOf = metric => {
        const dimensions = ['efficiency','effectiveness'];
        return dimensions.find(value => metric.category === value) ||
            dimensions.find(value => metric.dimension === value) || 'legacy';
    };

    function summarize(records,filters={}) {
        const list=records.filter(r=>r&&r.config&&Array.isArray(r.config.metrics)&&r.values&&typeof r.systemId==='string'&&typeof r.submittedAt==='string')
            .filter(r=>(filters.demo==='demo'?!!r.config.isDemo:!r.config.isDemo)&&(!filters.system||r.systemId===filters.system)&&(!filters.start||r.submittedAt.slice(0,10)>=filters.start)&&(!filters.end||r.submittedAt.slice(0,10)<=filters.end)&&(!filters.periodPrefix||r.submittedAt.startsWith(filters.periodPrefix)));
        const groups=new Map();let unavailable=0;
        for(const r of list)for(const m of r.config.metrics.filter(m=>m.active)) {
            const v=r.values[m.id];
            const key=JSON.stringify([r.systemId,r.config.version,m.id,m.name,m.unit,m.basis,m.source,m.direction,m.target??null,m.category??null,m.input??null,m.definition??null,m.periodMode??null]);
            if(!groups.has(key))groups.set(key,{systemId:r.systemId,version:r.config.version,metric:m,before:0,after:0,count:0});
            const g=groups.get(key);
            if(!v||v.status!=='known'||!finite(v.before)||!finite(v.after)){unavailable++;continue;}
            g.before+=v.before;g.after+=v.after;g.count++;
        }
        const displayGroups=[...groups.values()].map(g=>({...g,before:g.count?g.before/g.count:null,after:g.count?g.after/g.count:null}));
        const belowTarget=list.filter(r=>r.config.metrics.some(m=>m.active&&m.direction==='target'&&finite(m.target)&&r.values[m.id]?.status==='known'&&finite(r.values[m.id].after)&&r.values[m.id].after<m.target)).length;
        return {records:list,displayGroups,belowTarget,groups:displayGroups.filter(g=>g.count>0),systems:new Set(list.map(r=>r.systemId)).size,unavailable,targets:list.filter(r=>r.config.metrics.some(m=>m.active&&m.direction==='target'&&finite(m.target))).length};
    }
    const initialDataSet=records=>records.some(r=>r?.config&&!r.config.isDemo)?'real':records.some(r=>r?.config?.isDemo)?'demo':'real';
    function presentation(metric,input,calculate) {
        const result=calculate(metric,input);
        if(!result.available)return {tone:'missing',label:'ข้อมูลไม่เพียงพอ',arrow:'—',amount:null,percent:null,outcome:result.reason};
        return {tone:result.outcome==='ดีขึ้น'?'good':result.outcome==='แย่ลง'?'bad':'neutral',label:result.delta<0?'ลดลง':result.delta>0?'เพิ่มขึ้น':'ไม่เปลี่ยนแปลง',arrow:result.delta<0?'↓':result.delta>0?'↑':'↔',amount:Math.abs(result.delta),percent:result.percent,outcome:result.outcome};
    }
    function comparable(records, source) {
        const groups = new Map();
        for (const record of records) {
            const config = record.config;
            if (!Number.isInteger(config?.version) || config.version < 1 ||
                !Array.isArray(config.before) || !Array.isArray(config.after) ||
                !Array.isArray(config.metrics)) continue;

            const metrics = config.metrics.filter(metric => metric.active && metric.source === source && metric.category !== 'effectiveness');
            const expectedUnit = source === 'time' ? 'นาที' : 'ขั้นตอน';
            if (metrics.length !== 1 || metrics[0].unit !== expectedUnit || typeof metrics[0].basis !== 'string' || !metrics[0].basis.trim()) continue;
            const [metric] = metrics;
            const phases = [config.before, config.after].map(steps => steps.filter(step => step.active && (source !== 'time' || step.timed)));
            if (phases.some(steps => !steps.length || steps.some(step => !step.id || !step.name))) continue;

            const value = record.values?.[metric.id];
            if (value?.status !== 'known' || !finite(value.before) || !finite(value.after)) continue;
            const key = JSON.stringify([record.systemId, config.release, config.version, metric.id, metric.unit, metric.basis,
                phases.map(steps => steps.map(({id, name, description}) => [id, name, description]))]);
            if (!groups.has(key)) groups.set(key, {before:0, after:0, count:0, basis:metric.basis, version:config.version});
            const group = groups.get(key);
            group.before += value.before;
            group.after += value.after;
            group.count++;
        }
        if (groups.size !== 1) return {
            reason: groups.size ? 'เลือกหนึ่งระบบและเวอร์ชันที่ใช้ฐานการวัดเดียวกัน' : 'ไม่มีข้อมูลก่อน–หลังที่เปรียบเทียบได้'
        };
        const group = groups.values().next().value;
        group.before /= group.count;
        group.after /= group.count;
        group.percent = group.before === 0 ? null : (group.after - group.before) / group.before * 100;
        return group;
    }

    function metricKey(record, metric) {
        const config = record.config;
        const processes = ['time','steps'].includes(metric.source)
            ? [config.before,config.after].map(steps => (steps || [])
                .filter(step => step.active && (metric.source !== 'time' || step.timed))
                .map(step => [step.id,step.name,step.description]))
            : null;
        return JSON.stringify([record.systemId,config.release,config.version,metric.id,metric.name,dimensionOf(metric),
            metric.unit,metric.basis,metric.direction,metric.target,metric.source,metric.input,metric.definition,
            metric.periodMode,processes]);
    }

    function analysisGroups(records, Q) {
        const buckets = new Map();
        const seen = new Set();
        for (const record of records) {
            if (record.id && seen.has(record.id)) continue;
            if (record.id) seen.add(record.id);
            const config = record.config;
            if (!Array.isArray(config?.metrics)) continue;
            for (const metric of config.metrics.filter(item => item.active)) {
                const input = record.values?.[metric.id];
                const before = Q.displayValue(input, 'before');
                const after = Q.displayValue(input, 'after');
                if (before === null && after === null) continue;
                const result = Q.calculate(metric,input);
                const paired = result.available;
                const identity = metricKey(record,metric);
                const key = JSON.stringify([identity,paired]);
                if (!buckets.has(key)) buckets.set(key,[]);
                buckets.get(key).push({record,metric,input,before,after,paired,result});
            }
        }

        function canPool(entries) {
            if (entries.some(({record,metric,paired}) => !paired || !metric.basis)) return false;
            if (entries[0].metric.input !== 'ratio') return true;
            const windows = [];
            for (const {metric,input} of entries) {
                for (const phase of ['before','after']) {
                    const bounds = Q.periodBounds(metric.periodMode,input.periods?.[phase]);
                    const counts = input.counts?.[phase];
                    if (!bounds || Q.rate(counts?.success,counts?.total) === null) return false;
                    windows.push(bounds);
                }
            }
            windows.sort((a,b) => a[0]-b[0]);
            return windows.every((bounds,index) => index === 0 || windows[index-1][1] < bounds[0]);
        }

        function aggregate(entries) {
            const first = entries[0];
            const {metric,record} = first;
            const average = phase => entries.reduce((sum,entry) => sum + entry[phase],0) / entries.length;
            const pooledRate = phase => {
                const counts = entries.map(entry => entry.input.counts[phase]);
                return Q.rate(counts.reduce((sum,value) => sum+value.success,0),counts.reduce((sum,value) => sum+value.total,0));
            };
            const value = phase => entries.length === 1 ? first[phase] :
                metric.input === 'ratio' ? pooledRate(phase) : average(phase);
            const before = value('before'), after = value('after');
            const result = entries.length === 1 ? first.result :
                Q.calculate(metric,{status:'known',before,after,periods:first.input.periods});
            const goals = entries.map(entry => Q.effectiveness({...metric,category:dimensionOf(metric)},entry.input)).filter(goal => goal !== null);
            return {metric,systemId:record.systemId,before,after,result,goals,
                records:entries.map(entry => entry.record)};
        }
        return [...buckets.values()].flatMap(entries => canPool(entries) ? [aggregate(entries)] : entries.map(entry => aggregate([entry])));
    }

    function dimensionSummary(records, groups, dimension) {
        const comparable = groups.filter(group => dimensionOf(group.metric) === dimension && group.result.available);
        const identities = new Set(comparable.map(group => metricKey(group.records[0],group.metric)));
        const unavailable = new Set();
        for (const record of records) {
            for (const metric of record.config?.metrics || []) {
                if (!metric.active || dimensionOf(metric) !== dimension) continue;
                const identity = metricKey(record,metric);
                if (!identities.has(identity)) unavailable.add(identity);
            }
        }

        const total = comparable.length;
        const unit = identities.size < total ? 'กลุ่มตัวชี้วัด' : 'ตัวชี้วัด';
        const labels = [['ดีขึ้น','ดีขึ้น'],['แย่ลง','แย่ลง'],['คงเดิม','ไม่เปลี่ยนแปลง']];
        const parts = labels.flatMap(([outcome,label]) => {
            const count = comparable.filter(group => group.result.outcome === outcome).length;
            return count ? [`${label} ${count}/${total} ${unit}`] : [];
        });
        if (unavailable.size) parts.push(`ข้อมูลไม่เพียงพอ ${unavailable.size} ตัวชี้วัด`);
        return parts.join(' · ') || 'ข้อมูลไม่เพียงพอ';
    }

    function submittedRecords(records, {system = '', periodPrefix = '', role = ''} = {}) {
        const seen = new Set();
        return records.filter(record => {
            if (!record || typeof record.systemId !== 'string' || !record.systemId ||
                typeof record.submittedAt !== 'string' || !Number.isFinite(Date.parse(record.submittedAt)) ||
                record.config?.isDemo || record.config?.version === 'demo-1' ||
                (record.id && seen.has(record.id))) return false;
            if (record.id) seen.add(record.id);
            return (!system || record.systemId === system) && record.submittedAt.startsWith(periodPrefix) &&
                (!role || (record.profile?.role || record.userRole) === role);
        });
    }

    if (typeof module !== 'undefined') module.exports = {summarize, initialDataSet, presentation, comparable, analysisGroups, dimensionSummary, submittedRecords};
    if (typeof document === 'undefined') return;
    const section = document.getElementById('quantitative-results');
    if (!section) return;

    const Q = root.Quantitative;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt = value => Number(value).toLocaleString('th-TH', {maximumFractionDigits:2});
    const insufficient = 'ยังไม่มีข้อมูลเพียงพอสำหรับประเมินประสิทธิผล';
    section.innerHTML = `
        <div class="qd-heading">
            <div><p class="qd-eyebrow">EFFICIENCY &amp; EFFECTIVENESS</p><h1>แดชบอร์ดผลการประเมินประสิทธิภาพและประสิทธิผล</h1><p>เปรียบเทียบการใช้ทรัพยากรก่อน–หลัง และติดตามผลสำเร็จตามเป้าหมายของแต่ละระบบ</p></div>
            <a class="btn btn-primary btn-sm" href="../../Effectiveness_Of_It/main/admin.html">จัดการกระบวนการและตัวชี้วัด</a>
        </div>
        <div class="qd-filters">
            <span id="qd-source" class="data-badge" role="status"></span>
            <label>ระบบ IT<select id="qd-system"></select></label>
            <label>ช่วงเวลา<select id="qd-period"><option value="">ทุกช่วงเวลา</option><option value="month">เดือนนี้</option><option value="year">ปีนี้</option></select></label>
            <label>ประเภทผู้ประเมิน<select id="qd-role"><option value="">ทุกประเภท</option><option value="student">นิสิต</option><option value="teacher">อาจารย์</option><option value="staff">เจ้าหน้าที่</option></select></label>
            <button type="button" class="btn btn-primary" id="qd-apply">แสดงผล</button>
            <details class="qd-report-actions"><summary>จัดการรายงาน</summary>
            <button type="button" class="btn btn-secondary" id="qd-import">นำเข้า JSON</button>
            <input type="file" accept=".json,application/json" id="qd-file" hidden>
            <button type="button" class="btn btn-secondary" id="qd-export">ส่งออก HTML</button>
            <button type="button" class="btn btn-primary" id="qd-print">ส่งออก PDF</button>
            </details>
        </div>
        <p id="qd-import-status" role="status"></p>
        <p id="qd-message" role="status"></p>
        <div id="qd-content"></div>
        <dialog id="qd-details" aria-labelledby="qd-details-title">
            <h3 id="qd-details-title"></h3>
            <div id="qd-details-content"></div>
            <form method="dialog"><button class="btn btn-secondary" autofocus>ปิด</button></form>
        </dialog>`;
    const el = id => document.getElementById(id);
    const systemFilter = el('qd-system');

    function setOptions(select, choices, all) {
        const previous = select.value;
        select.replaceChildren(new Option(all, ''), ...choices.map(([value, label]) => new Option(label, value)));
        select.value = choices.some(([value]) => value === previous) ? previous : '';
    }

    function indicatorDetails(record, metricId) {
        const metrics = record.config.metrics || [];
        return metrics.filter(metric => metric.active && (!metricId || metric.id === metricId)).map(metric => {
            const value = record.values?.[metric.id];
            const result = Q.calculate(metric, value);
            const met = Q.effectiveness({...metric,category:dimensionOf(metric)}, value);
            const values = ['before','after'].map(phase => Q.displayValue(value,phase)).map(number => number === null ? '—' : fmt(number));
            const change = result.available && result.percent !== null ? fmt(result.percent) + '%' : '—';
            const dimension = dimensionOf(metric);
            const isEffectiveness = dimension === 'effectiveness';
            const target = isEffectiveness && finite(metric.target) ? ` · เป้าหมาย ${metric.direction === 'increase' ? 'อย่างน้อย' : 'ไม่เกิน'} ${fmt(metric.target)} ${esc(metric.unit)}` : '';
            const outcome = met === null ? (isEffectiveness ? insufficient : result.outcome || result.reason) : (met ? 'บรรลุเป้าหมาย' : 'ไม่บรรลุเป้าหมาย');
            const reference = metric.input === 'ratio' ? Q.dataPhases(value?.status).map(phase => {
                const period = value?.periods?.[phase], counts = value?.counts?.[phase];
                return (phase === 'before' ? 'ก่อน: ' : 'หลัง: ') + (period?.start || '—') +
                    (period?.end ? ' ถึง '+period.end : '') + (counts ? ` · สำเร็จ ${counts.success} / ${counts.total} งาน` : '');
            }).join(' · ') : '';
            const warning = Q.periodIssue(metric,value);
            return `<li><strong>${esc(metric.name)}</strong> · ${isEffectiveness ? 'ประสิทธิผล' : dimension === 'efficiency' ? 'ประสิทธิภาพ' : 'ยังไม่ระบุมิติ'} · ${Q.dataStatuses[value?.status]?.[0] || 'ยังไม่ระบุสถานะข้อมูล'}<br>
                ก่อน ${values[0]} / หลัง ${values[1]} ${esc(metric.unit)} · ${esc(metric.basis)} · ผลต่าง ${result.available ? fmt(result.delta) + (metric.unit === '%' ? ' จุดเปอร์เซ็นต์' : ' ' + esc(metric.unit)) : '—'} · เปลี่ยนแปลง ${change}${target}<br>${esc(outcome)}${reference ? `<br>${esc(Q.periods[metric.periodMode] || 'ยังไม่ระบุช่วงเวลาข้อมูล')} · ${esc(reference)}` : ''}${warning ? `<br>${esc(warning)}` : ''}</li>`;
        }).join('');
    }

    function showDetails(name, records) {
        el('qd-details-title').textContent = name;
        el('qd-details-content').innerHTML = records.map(record => {
            const config = record.config;
            if (!Array.isArray(config?.before) || !Array.isArray(config.after)) {
                return '<p>รายการนี้มีสำเนากระบวนการไม่เพียงพอ</p>';
            }
            return `<details><summary>${esc(record.submittedAt)}</summary>
                ${['before','after'].map(phase => `<h4>${phase === 'before' ? 'ก่อนใช้ IT' : 'หลังใช้ IT'}</h4>
                <ol>${config[phase].filter(step => step.active).map(step => `<li>${esc(step.name)}${finite(record.durations?.[phase]?.[step.id]) ? ` · ${fmt(record.durations[phase][step.id])} นาที` : ''}</li>`).join('')}</ol>`).join('')}<h4>ตัวชี้วัดตามผลที่ส่ง</h4><ul>${indicatorDetails(record)}</ul></details>`;
        }).join('');
        el('qd-details').showModal();
    }

    const dimensions = [['efficiency','ประสิทธิภาพ'],['effectiveness','ประสิทธิผล'],['legacy','ตัวชี้วัดที่ต้องตรวจสอบ']];
    const valueLabel = (value,unit) => value === null ? '—' : fmt(value) + (unit === '%' ? '%' : ' '+esc(unit));

    function kpiPanels(groups,names) {
        return `<div class="qd-dimensions">${dimensions.filter(([key])=>key !== 'legacy').map(([category,title]) => {
            const items = groups.filter(group => dimensionOf(group.metric) === category);
            return `<section class="qd-dimension" data-dimension="${category}"><h3>${title}</h3>
                ${items.map(group => {
                    const {metric,before,after,result,goals} = group;
                    const change = result.available && metric.unit === '%' ? result.delta : result.percent;
                    const summary = result.available ? (change == null ? '—' : change === 0 ? 'ไม่เปลี่ยนแปลง' :
                        `${change < 0 ? 'ลดลง' : 'เพิ่มขึ้น'} ${fmt(Math.abs(change))}${metric.unit === '%' ? ' จุดเปอร์เซ็นต์' : '%'}`) : '—';
                    const tone = result.outcome === 'ดีขึ้น' ? 'reduced' : result.outcome === 'แย่ลง' ? 'increased' : 'neutral';
                    const passed = goals.filter(Boolean).length;
                    const goalLabel = !goals.length ? '' : goals.length === 1
                        ? (passed ? 'บรรลุเป้าหมาย' : 'ไม่บรรลุเป้าหมาย')
                        : `บรรลุเป้าหมาย ${passed} / ${goals.length} รายการที่ตรวจได้`;
                    return `<article><h4>${esc(metric.name)}</h4>
                        <p>${before === null ? 'หลังใช้ '+valueLabel(after,metric.unit) : valueLabel(before,metric.unit)+' → '+valueLabel(after,metric.unit)}</p>
                        <strong class="qd-analysis-value" data-tone="${tone}">${summary}</strong>
                        <p>${result.available ? esc(result.outcome) : before === null ? 'มีข้อมูลเฉพาะหลังใช้' : 'เปรียบเทียบไม่ได้'}</p>
                        ${goalLabel ? `<p>${goalLabel}</p>` : ''}
                        <details><summary>ดูรายละเอียด</summary>
                            <p>${esc(names.get(group.systemId) || group.systemId)} · ${group.records.length} รายการ · ${esc(metric.basis)}</p>
                            ${!result.available ? `<p>${esc(result.reason)}</p>` : ''}
                            <ul>${group.records.map(record => indicatorDetails(record,metric.id)).join('')}</ul></details>
                    </article>`;
                }).join('') || '<p>ไม่มีข้อมูลตามตัวกรอง</p>'}
            </section>`;
        }).join('')}</div>`;
    }

    function render() {
        try {
            const records = submittedRecords(Q.records());
            el('qd-source').textContent = 'ข้อมูลในเบราว์เซอร์ (localStorage)';
            const catalog = Q.systems();
            const names = new Map(catalog.map(system => [system.id, system.name]));
            const ids = [...new Set([...names.keys(), ...records.map(record => record.systemId)])];
            setOptions(systemFilter, ids.map(id => [id, `${names.get(id) || id} (${id})`]), 'ทุกระบบ');
            const now = new Date();
            const period = el('qd-period').value;
            const year = String(now.getFullYear());
            const prefix = period === 'month' ? year + '-' + String(now.getMonth() + 1).padStart(2, '0') : period === 'year' ? year : '';
            const role = el('qd-role').value;
            const selectedSystem = systemFilter.value;
            const filtered = submittedRecords(records,{system:selectedSystem,periodPrefix:prefix,role});
            const configuredTarget = selectedSystem && Q.config(selectedSystem).metrics.find(metric =>
                metric.id === 'outcome' && metric.active && dimensionOf(metric) === 'effectiveness' && finite(metric.target));
            const systemIds = [...new Set(filtered.map(record => record.systemId))];
            const observations = filtered.flatMap(record => (record.config?.metrics || [])
                .filter(metric => metric.active).map(metric => ({metric,input:record.values?.[metric.id]})));
            const comparableCount = observations.filter(({metric,input}) => Q.calculate(metric,input).available).length;
            const unknown = observations.filter(({metric}) => dimensionOf(metric) === 'legacy');
            const cards = [
                ['ระบบ IT ที่มีผลประเมิน',systemIds.length,'ระบบ'],
                ['ผลประเมินที่ส่งแล้ว',filtered.length,'รายการ'],
                ['KPI ที่เปรียบเทียบได้',comparableCount,'ผลตัวชี้วัด'],
            ];
            el('qd-message').textContent = filtered.length
                ? 'ใช้เฉพาะผลที่ยืนยันแล้วในเบราว์เซอร์นี้ · อัตรางานสำเร็จรวมเฉพาะช่วงที่ตรวจได้ว่าไม่ซ้อนกัน'
                : records.length ? 'ยังไม่มีผลประเมินจริงตามตัวกรองที่เลือก' : 'ยังไม่มีผลประเมินเชิงปริมาณในเบราว์เซอร์นี้';
            const statuses = filtered.flatMap(record => (record.config?.metrics || [])
                .filter(metric => metric.active).map(metric => record.values?.[metric.id]?.status));
            const count = status => statuses.filter(value => value === status).length;
            const groups = analysisGroups(filtered,Q);
            const rows = systemIds.map(id => {
                const entries = filtered.filter(record => record.systemId === id);
                const systemGroups = groups.filter(group => group.systemId === id);
                const status = dimension => dimensionSummary(entries,systemGroups,dimension);
                return `<tr><th scope="row">${esc(names.get(id) || id)}<br><small>${esc(id)}</small></th><td>${entries.length}</td>
                    <td>${status('efficiency')}</td><td>${status('effectiveness')}</td>
                    <td><button type="button" class="btn btn-secondary btn-sm" data-qd-details="${esc(id)}">ดูรายละเอียด →</button></td></tr>`;
            });
            const panels = systemIds.length > 1 ? systemIds.map((id,index) =>
                `<details class="qd-main-chart"${index === 0 ? ' open' : ''}><summary>${esc(names.get(id) || id)} (${esc(id)})</summary>
                    ${kpiPanels(groups.filter(group => group.systemId === id),names)}</details>`).join('')
                : kpiPanels(groups,names);
            el('qd-content').innerHTML = `
                <div class="qd-stats">${cards.map(([title,value,detail]) => `<div><h3>${title}</h3><strong data-tone="count">${value}</strong><p>${esc(detail)}</p></div>`).join('')}</div>
                <p>ไม่ทราบข้อมูล: ${count('unknown')} KPI · ไม่เกี่ยวข้อง: ${count('na')} KPI</p>
                ${configuredTarget ? `<p>เกณฑ์ปัจจุบันของระบบที่เลือก: ${configuredTarget.direction === 'decrease' ? 'ไม่เกิน' : 'อย่างน้อย'} ${fmt(configuredTarget.target)}%
                    · ใช้แสดงค่าตั้งปัจจุบัน ผลย้อนหลังใช้เกณฑ์ที่บันทึกตอนส่ง</p>` : ''}
                ${panels}
                ${unknown.length ? `<details class="qd-main-chart"><summary>ผลตัวชี้วัดที่ไม่ระบุมิติ (${unknown.length} รายการ)</summary>
                    <p>สำเนาผลเหล่านี้ไม่มีมิติที่ระบบรู้จัก ดูค่าที่บันทึกไว้ในตารางรายระบบได้</p>
                    <ul>${[...new Set(unknown.map(({metric}) => metric.name || metric.id))].map(name => `<li>${esc(name)}</li>`).join('')}</ul>
                </details>` : ''}
                <h3 class="qd-level-heading">รายละเอียด</h3>
                <details class="qd-report-table"><summary>ตารางสรุปผลรายระบบ</summary>
                    <header><div><h3>ตารางสรุปผลรายระบบ</h3><p>สรุปผลการเปลี่ยนแปลงประสิทธิภาพและสถานะประสิทธิผลของระบบสารสนเทศ</p></div><span>${systemIds.length} ระบบ</span></header>
                <div class="qd-table" tabindex="0" role="region" aria-label="ตารางสรุปผลรายระบบ">
                    <table><thead><tr><th>ระบบ IT</th><th>จำนวนผลประเมิน</th><th>ผลด้านประสิทธิภาพ</th><th>ผลด้านประสิทธิผล</th><th>รายละเอียด</th></tr></thead>
                    <tbody>${rows.join('') || '<tr><td colspan="5">ยังไม่มีข้อมูล</td></tr>'}</tbody></table>
                </div></details>`;
            section.querySelectorAll('[data-qd-details]').forEach(button => {
                button.onclick = () => {
                    const id = button.dataset.qdDetails;
                    showDetails(names.get(id) || id, filtered.filter(record => record.systemId === id));
                };
            });
        } catch (error) {
            el('qd-source').textContent = 'อ่านข้อมูลไม่ได้';
            el('qd-message').textContent = 'อ่านผลประเมินเชิงปริมาณไม่ได้: ' + error.message;
            el('qd-content').replaceChildren();
        }
    }

    el('qd-apply').addEventListener('click', render);
    el('qd-period').addEventListener('change', render);
    el('qd-role').addEventListener('change', render);
    el('qd-import').onclick = () => el('qd-file').click();
    el('qd-file').onchange = async event => {
        const input = event.currentTarget;
        const file = input.files[0];
        if (!file) return;
        const status = el('qd-import-status');
        try {
            const records = JSON.parse(await file.text());
            const valid = record => record && typeof record.id === 'string' && record.id.trim() &&
                typeof record.systemId === 'string' && record.systemId.trim() &&
                typeof record.submittedAt === 'string' && Number.isFinite(Date.parse(record.submittedAt)) &&
                record.config && !record.config.isDemo && record.config.version !== 'demo-1' &&
                ['before', 'after', 'metrics'].every(key => Array.isArray(record.config[key]) &&
                    record.config[key].every(item => item && typeof item.id === 'string')) &&
                record.values && typeof record.values === 'object' && !Array.isArray(record.values);
            if (!Array.isArray(records) || !records.length || !records.every(valid)) throw new Error('ไฟล์ต้องเป็นรายการผลเชิงปริมาณที่มีสำเนาการตั้งค่า');
            const existing = Q.records();
            const ids = new Set(existing.map(record => record.id));
            const added = records.filter(record => {
                if (ids.has(record.id)) return false;
                ids.add(record.id);
                return true;
            });
            if (added.length) localStorage.setItem(Q.keys.records, JSON.stringify([...existing, ...added]));
            status.textContent = `นำเข้า ${added.length} รายการ · ข้ามรหัสซ้ำ ${records.length - added.length} รายการ`;
            render();
        } catch (error) {
            status.textContent = 'นำเข้าไม่สำเร็จ: ' + error.message;
        } finally {
            input.value = '';
        }
    };

    function reportDocument() {
        const content = el('qd-content').cloneNode(true);
        content.querySelectorAll('details.qd-report-table').forEach(details => { details.open = true; });
        content.querySelectorAll('th:last-child, td:has([data-qd-details])').forEach(cell => {
            if (cell.closest('thead') || cell.querySelector('[data-qd-details]')) cell.remove();
        });
        return `<!doctype html><html lang="th"><meta charset="utf-8"><title>แดชบอร์ดผลการประเมินประสิทธิภาพและประสิทธิผล</title>
            <style>body{font:16px system-ui;margin:24px;color:#172b4d} table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:8px}figure{margin:12px 0}.qd-stats{display:flex;flex-wrap:wrap;gap:16px}</style>
            <h1>แดชบอร์ดผลการประเมินประสิทธิภาพและประสิทธิผล</h1>
            <p>${[systemFilter, el('qd-period'), el('qd-role')].map(select => esc(select.selectedOptions[0]?.textContent)).join(' · ')}</p>
            ${content.innerHTML}</html>`;
    }

    el('qd-export').onclick = () => {
        const url = URL.createObjectURL(new Blob([reportDocument()], {type:'text/html;charset=utf-8'}));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'quantitative-report.html';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    el('qd-print').onclick = () => {
        const report = window.open('', '_blank');
        if (!report) {
            el('qd-import-status').textContent = 'กรุณาอนุญาตให้เปิดหน้าต่างรายงานเพื่อพิมพ์ PDF';
            return;
        }
        report.document.write(reportDocument());
        report.document.close();
        report.focus();
        report.print();
    };

    systemFilter.addEventListener('change', () => {
        render();
    });
    root.addEventListener('storage', event => {
        if (event.key === Q.keys.records || event.key === Q.keys.config || event.key === null) render();
    });
    render();
})(typeof window !== 'undefined' ? window : globalThis);
