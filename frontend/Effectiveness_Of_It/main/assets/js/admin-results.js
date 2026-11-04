(function(root) {
    'use strict';
    const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
    function summarize(records,filters={}) {
        const list=records.filter(r=>r&&r.config&&Array.isArray(r.config.metrics)&&r.values&&typeof r.systemId==='string'&&typeof r.submittedAt==='string')
            .filter(r=>(filters.demo==='demo'?!!r.config.isDemo:!r.config.isDemo)&&(!filters.system||r.systemId===filters.system)&&(!filters.start||r.submittedAt.slice(0,10)>=filters.start)&&(!filters.end||r.submittedAt.slice(0,10)<=filters.end)&&(!filters.periodPrefix||r.submittedAt.startsWith(filters.periodPrefix)));
        const groups=new Map();let unavailable=0;
        for(const r of list)for(const m of r.config.metrics.filter(m=>m.active)) {
            const v=r.values[m.id];
            const key=JSON.stringify([r.systemId,r.config.version,m.id,m.name,m.unit,m.basis,m.source,m.direction,m.target??null]);
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

            const metrics = config.metrics.filter(metric => metric.active && metric.source === source);
            const expectedUnit = source === 'time' ? 'นาที' : 'ขั้นตอน';
            if (metrics.length !== 1 || metrics[0].unit !== expectedUnit || !metrics[0].basis?.trim()) continue;
            const [metric] = metrics;
            const phases = [config.before, config.after].map(steps => steps.filter(step => step.active && (source !== 'time' || step.timed)));
            if (phases.some(steps => !steps.length || steps.some(step => !step.id || !step.name))) continue;

            const value = record.values?.[metric.id];
            if (value?.status !== 'known' || !finite(value.before) || !finite(value.after)) continue;
            const key = JSON.stringify([record.systemId, config.version, metric.id, metric.unit, metric.basis,
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

    if (typeof module !== 'undefined') module.exports = {summarize, initialDataSet, presentation, comparable};
    if (typeof document === 'undefined') return;
    const section = document.getElementById('quantitative-results');
    if (!section) return;
    const syncSectionVisibility = () => { section.hidden = root.location.hash !== '#quantitative-results'; };
    syncSectionVisibility();
    root.addEventListener('hashchange', syncSectionVisibility);

    const Q = root.Quantitative;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt = value => Number(value).toLocaleString('th-TH', {maximumFractionDigits:2});
    const insufficient = 'ยังไม่มีข้อมูลเพียงพอสำหรับประเมินประสิทธิผล';
    const percent = group => {
        if (group.percent == null) return '—';
        if (group.percent === 0) return 'ไม่เปลี่ยนแปลง 0%';
        return `${group.percent < 0 ? '↓ ลดลง' : '↑ เพิ่มขึ้น'} ${fmt(Math.abs(group.percent))}%`;
    };
    const tone = group => group.percent < 0 ? 'reduced' : group.percent > 0 ? 'increased' : 'neutral';
    const comparison = (group, unit) => group.count
        ? `จาก ${fmt(group.before)} ${unit} เป็น ${fmt(group.after)} ${unit}`
        : '';
    const note = group => group.reason || (group.percent === null ? 'ค่าเริ่มต้นเป็นศูนย์' : `${group.count} รายการ · เวอร์ชัน ${group.version} · ${group.basis}`);

    section.innerHTML = `
        <div class="qd-heading">
            <div><p class="qd-eyebrow">EFFICIENCY &amp; EFFECTIVENESS</p><h2>ผลประเมินประสิทธิภาพและประสิทธิผล</h2></div>
            <a class="btn btn-primary btn-sm" href="../../Effectiveness_Of_It/main/admin.html">จัดการกระบวนการและตัวชี้วัด</a>
        </div>
        <div class="qd-filters">
            <label>ระบบ IT<select id="qd-system"></select></label>
            <label>เวอร์ชัน<select id="qd-version"></select></label>
        </div>
        <p id="qd-message" role="status"></p>
        <div id="qd-content"></div>
        <dialog id="qd-details" aria-labelledby="qd-details-title">
            <h3 id="qd-details-title"></h3>
            <div id="qd-details-content"></div>
            <form method="dialog"><button class="btn btn-secondary" autofocus>ปิด</button></form>
        </dialog>`;
    const el = id => document.getElementById(id);
    const systemFilter = el('qd-system');
    const versionFilter = el('qd-version');

    function setOptions(select, choices, all) {
        const previous = select.value;
        select.replaceChildren(new Option(all, ''), ...choices.map(([value, label]) => new Option(label, value)));
        select.value = choices.some(([value]) => value === previous) ? previous : '';
    }

    function showDetails(name, records) {
        el('qd-details-title').textContent = name;
        el('qd-details-content').innerHTML = records.map(record => {
            const config = record.config;
            if (!Number.isInteger(config?.version) || !Array.isArray(config.before) || !Array.isArray(config.after)) {
                return '<p>รายการนี้มีข้อมูลเวอร์ชันหรือสำเนากระบวนการไม่เพียงพอ</p>';
            }
            return `<details><summary>เวอร์ชัน ${esc(config.version)} · ${esc(record.submittedAt)}</summary>
                ${['before','after'].map(phase => `<h4>${phase === 'before' ? 'ก่อนใช้ IT' : 'หลังใช้ IT'}</h4>
                <ol>${config[phase].filter(step => step.active).map(step => `<li>${esc(step.name)}${finite(record.durations?.[phase]?.[step.id]) ? ` · ${fmt(record.durations[phase][step.id])} นาที` : ''}</li>`).join('')}</ol>`).join('')}</details>`;
        }).join('');
        el('qd-details').showModal();
    }

    function render() {
        try {
            const records = Q.records().filter(record => record?.systemId && typeof record.submittedAt === 'string' &&
                record.submittedAt && !record.config?.isDemo && record.config?.version !== 'demo-1');
            const catalog = Q.systems();
            const names = new Map(catalog.map(system => [system.id, system.name]));
            const ids = [...new Set([...names.keys(), ...records.map(record => record.systemId)])];
            setOptions(systemFilter, ids.map(id => [id, `${names.get(id) || id} (${id})`]), 'ทุกระบบ');
            const scoped = records.filter(record => !systemFilter.value || record.systemId === systemFilter.value);
            const versions = [...new Set(scoped.map(record => record.config?.version).filter(Number.isInteger))].sort((a,b) => b-a);
            setOptions(versionFilter, versions.map(version => [String(version), `เวอร์ชัน ${version}`]), 'ทุกเวอร์ชัน');
            const filtered = scoped.filter(record => !versionFilter.value || String(record.config?.version) === versionFilter.value);
            const systemIds = [...new Set(filtered.map(record => record.systemId))];
            const time = comparable(filtered, 'time');
            const steps = comparable(filtered, 'steps');
            const cards = [
                ['ระบบ IT ที่มีผลประเมิน', systemIds.length, 'ระบบ'],
                ['ผลประเมินทั้งหมด', filtered.length, 'รายการ'],
                ['การเปลี่ยนแปลงเวลา', percent(time), note(time), time, 'นาที'],
                ['การเปลี่ยนแปลงจำนวนขั้นตอน', percent(steps), note(steps), steps, 'ขั้นตอน']
            ];
            el('qd-message').textContent = filtered.length
                ? 'ใช้เฉพาะผลที่ยืนยันแล้วในเบราว์เซอร์นี้ ค่าเป็นลบหมายถึงลดลง'
                : 'ยังไม่มีผลประเมินจริงตามตัวกรองที่เลือก';
            const chart = time.count ? `
                <p>${esc(time.basis)} · เวอร์ชัน ${time.version} · ${time.count} รายการ</p>
                ${[['ก่อนใช้ IT',time.before],['หลังใช้ IT',time.after]].map(([title,value]) => `
                    <div class="qd-bar-row"><span>${title}</span><div><i style="width:${value / (Math.max(time.before,time.after) || 1) * 100}%"></i></div><strong>${fmt(value)} นาที</strong></div>`).join('')}`
                : `<p class="qd-empty">${esc(time.reason)}</p>`;
            const rows = systemIds.map(id => {
                const entries = filtered.filter(record => record.systemId === id);
                const rowTime = comparable(entries, 'time');
                const rowSteps = comparable(entries, 'steps');
                return `<tr><th scope="row">${esc(names.get(id) || id)}<br><small>${esc(id)}</small></th><td>${entries.length}</td>
                    <td><strong data-tone="${tone(rowTime)}">${percent(rowTime)}</strong><br><small>${comparison(rowTime, 'นาที')}</small><small>${esc(note(rowTime))}</small></td>
                    <td><strong data-tone="${tone(rowSteps)}">${percent(rowSteps)}</strong><br><small>${comparison(rowSteps, 'ขั้นตอน')}</small><small>${esc(note(rowSteps))}</small></td>
                    <td><span class="qd-status" title="${insufficient}">ข้อมูลไม่เพียงพอ</span></td><td><button type="button" class="btn btn-secondary btn-sm" data-qd-details="${esc(id)}">ดูรายละเอียด →</button></td></tr>`;
            });
            el('qd-content').innerHTML = `
                <div class="qd-stats">${cards.map(([title,value,detail,group,unit]) => `<div><h3>${title}</h3><strong data-tone="${group ? tone(group) : 'count'}">${value}</strong>${group?.count ? `<p>${comparison(group,unit)}</p>` : ''}<p>${esc(detail)}</p></div>`).join('')}</div>
                <figure class="qd-main-chart"><figcaption>เวลาเฉลี่ยก่อนและหลังใช้ IT</figcaption>${chart}</figure>
                <section class="qd-report-table">
                    <header><div><h3>ตารางสรุปผลรายระบบ</h3><p>สรุปผลการเปลี่ยนแปลงประสิทธิภาพและสถานะประสิทธิผลของระบบสารสนเทศ</p></div><span>${systemIds.length} ระบบ</span></header>
                <div class="qd-table" tabindex="0" role="region" aria-label="ตารางสรุปผลรายระบบ">
                    <table><thead><tr><th>ระบบ IT</th><th>จำนวนผลประเมิน</th><th>การเปลี่ยนแปลงเวลา</th><th>การเปลี่ยนแปลงขั้นตอน</th><th>สถานะประสิทธิผล</th><th>รายละเอียด</th></tr></thead>
                    <tbody>${rows.join('') || '<tr><td colspan="6">ยังไม่มีข้อมูล</td></tr>'}</tbody></table>
                </div></section>`;
            section.querySelectorAll('[data-qd-details]').forEach(button => {
                button.onclick = () => {
                    const id = button.dataset.qdDetails;
                    showDetails(names.get(id) || id, filtered.filter(record => record.systemId === id));
                };
            });
        } catch (error) {
            el('qd-message').textContent = 'อ่านผลประเมินเชิงปริมาณไม่ได้: ' + error.message;
            el('qd-content').replaceChildren();
        }
    }

    systemFilter.addEventListener('change', () => {
        versionFilter.value = '';
        render();
    });
    versionFilter.addEventListener('change', render);
    root.addEventListener('storage', event => {
        if (event.key === Q.keys.records || event.key === Q.keys.config || event.key === null) render();
    });
    render();
})(typeof window !== 'undefined' ? window : globalThis);
