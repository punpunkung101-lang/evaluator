(() => {
    'use strict';
    const Q = window.Quantitative, app = document.getElementById('quant-app');
    const page = document.body.dataset.quantPage;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const user = value => `<span data-user-content>${esc(value)}</span>`;
    const uid = () => crypto.randomUUID();
    const num = value => value === '' || value === null || value === undefined ? null : Number(value);
    const fmt = value => value === null || value === undefined ? '—' : Number(value).toLocaleString('th-TH', { maximumFractionDigits:2 });
    let systems = [];
    const systemOptions = selected => '<option value="">เลือกระบบ IT</option>' + systems.map(s => `<option data-user-content value="${esc(s.id)}" ${s.id === selected ? 'selected' : ''}>${esc(s.id)} — ${esc(s.name)}</option>`).join('');
    const field = (id, label, value = '', type = 'text') => `<label for="${id}">${esc(label)}<input id="${id}" type="${type}" ${type === 'number' ? 'min="0" step="any"' : ''} value="${esc(value)}" placeholder="${type==='number'?'ระบุตัวเลขตั้งแต่ 0 ขึ้นไป':type==='text'?'กรอกข้อมูล':''}" aria-describedby="${id}-error"></label><small class="q-error" id="${id}-error"></small>`;
    const error = (id, text) => { const input = document.getElementById(id); input?.setAttribute('aria-invalid','true'); const el = document.getElementById(`${id}-error`); if (el) el.textContent = text; };
    const reportError = e => { const message = document.getElementById('q-message'); if (message) message.textContent = `ไม่สามารถดำเนินการได้: ${e.message}`; else app.textContent = `ไม่สามารถดำเนินการได้: ${e.message}`; return false; };
    const safe = fn => { try { const result=fn(); return result && typeof result.then==='function' ? result.catch(reportError) : result; } catch(e) { return reportError(e); } };
    function referenceFields(metric, phase, period) {
        if (!Object.hasOwn(Q.periods,metric.periodMode)) return '';
        const id = `${phase}-${metric.id}-period`;
        const title = phase === 'before' ? 'ก่อนใช้ระบบ' : 'หลังใช้ระบบ';
        const mode = metric.periodMode;
        const type = mode === 'month' ? 'month' : mode === 'year' ? 'number' : 'date';
        return field(id+'-start', title+' · '+(mode === 'custom' ? 'วันที่เริ่มต้น' : Q.periods[mode]), period?.start, type) +
            (mode === 'custom' ? field(id+'-end', title+' · วันที่สิ้นสุด', period?.end, 'date') : '');
    }

    function referenceSummary(metric, value) {
        if (metric.input !== 'ratio') return '';
        const mode = Q.periods[metric.periodMode];
        return (mode || 'ยังไม่ระบุช่วงเวลาข้อมูล') + ' · ' + Q.dataPhases(value?.status).map(phase => {
            const period = value?.periods?.[phase], counts = value?.counts?.[phase];
            return (phase === 'before' ? 'ก่อน: ' : 'หลัง: ') +
                (period?.start ? period.start + (period.end ? ' ถึง '+period.end : '') : '—') +
                (counts ? ` · สำเร็จ ${counts.success ?? '—'} / ${counts.total ?? '—'} งาน` : '');
        }).join(' · ');
    }

    function resultTable(record) {
        const rows = record.config.metrics.filter(m => m.active).map(m => {
            const input = record.values[m.id], result = Q.calculate(m, input);
            const met = Q.effectiveness(m, input);
            const goal = m.category === 'effectiveness'
                ? (met === null ? 'ข้อมูลประสิทธิผลไม่เพียงพอ' : met ? 'บรรลุเป้าหมาย' : 'ไม่บรรลุเป้าหมาย')
                : '';
            return `<tr><th scope="row">${user(m.name)}<br><small>${m.category === 'effectiveness' ? 'ประสิทธิผล · ' : 'ประสิทธิภาพ · '}${user(m.unit)} / ${user(m.basis)}<br>${Q.dataStatuses[input?.status]?.[0] || 'ยังไม่ระบุสถานะข้อมูล'}${m.input === 'ratio' ? `<br>${user(referenceSummary(m,input))}` : ''}</small></th><td>${fmt(Q.displayValue(input,'before'))}</td><td>${fmt(Q.displayValue(input,'after'))}</td><td>${result.available ? fmt(result.delta) + (m.unit === '%' ? ' จุดเปอร์เซ็นต์' : '') : '—'}</td><td>${result.available ? result.percent === null ? 'คำนวณเปอร์เซ็นต์ไม่ได้: ค่าเดิมเป็น 0' : fmt(result.percent) + '%' : esc(result.reason)}</td><td>${result.available ? esc(result.outcome) + (m.direction === 'target' ? ` · เป้าหมาย ${fmt(m.target)} (${result.targetMet ? 'ถึงเป้าหมาย' : 'ยังไม่ถึงเป้าหมาย'})` : '') : '—'}${goal ? ' · ' + goal : ''}</td></tr>`;
        }).join('');
        const statuses = record.config.metrics.filter(metric=>metric.active).map(metric=>record.values[metric.id]?.status);
        const count = status => statuses.filter(value=>value===status).length;
        return `${record.config.isDemo ? '<p class="prototype">ข้อมูลจำลองจากกระบวนการตัวอย่าง ไม่ใช่ผลประเมินจริงของระบบ IT</p>' : ''}<div class="q-table-wrap"><table><caption>ผลต่าง = ค่าใหม่ − ค่าเดิม · เปอร์เซ็นต์ติดลบหมายถึงค่าลดลง</caption><thead><tr><th>ตัวชี้วัด</th><th>ก่อน</th><th>หลัง</th><th>ผลต่าง</th><th>การเปลี่ยนแปลง</th><th>ผล</th></tr></thead><tbody>${rows}</tbody></table></div><p>ไม่ทราบข้อมูล: ${count('unknown')} KPI · ไม่เกี่ยวข้อง: ${count('na')} KPI</p>${record.config.metrics.some(m => m.active && m.category === 'effectiveness' && Q.finite(m.target)) ? '' : '<p>ยังไม่ได้กำหนดเกณฑ์ประสิทธิผล</p>'}`;
    }
    function reviewKpiTable(record) {
        const rows = record.config.metrics.filter(metric => metric.active).map(metric => {
            const input = record.values[metric.id];
            const result = Q.calculate(metric, input);
            const before = Q.displayValue(input, 'before');
            const after = Q.displayValue(input, 'after');
            const met = Q.effectiveness(metric, input) ?? result.targetMet;
            const change = metric.unit === '%' ? result.delta : result.percent;
            const direction = change > 0 ? 'เพิ่มขึ้น' : 'ลดลง';
            const changeText = !result.available ? '—' : change === null ? 'คำนวณร้อยละไม่ได้' :
                change === 0 ? 'ไม่เปลี่ยนแปลง' :
                direction + ' ' + fmt(Math.abs(change)) + (metric.unit === '%' ? ' จุดเปอร์เซ็นต์' : '%');
            const outcome = result.available ? (result.outcome === 'คงเดิม' ? 'ไม่เปลี่ยนแปลง' : result.outcome) :
                input?.status === 'na' ? 'ไม่เกี่ยวข้อง' : input?.status === 'unknown' ? 'ไม่ทราบข้อมูล' :
                input?.status === 'after-only' ? '' : 'ข้อมูลไม่เพียงพอ';
            const goal = met == null ? '' : met ? 'บรรลุเป้าหมาย' : 'ไม่บรรลุเป้าหมาย';
            const formatValue = value => value === null ? '—' : fmt(value) + (metric.unit === '%' ? '%' : ' ' + esc(metric.unit));
            const target = Q.finite(metric.target)
                ? (metric.direction === 'increase' ? 'อย่างน้อย ' : metric.direction === 'decrease' ? 'ไม่เกิน ' : 'เท่ากับ ') + formatValue(metric.target)
                : 'ยังไม่กำหนด';
            const reference = referenceSummary(metric, input);
            return `<tr>
                <th scope="row">${user(metric.name)}
                    <details><summary>ดูรายละเอียด</summary>
                        <p>มิติการประเมิน: ${metric.category === 'effectiveness' ? 'ประสิทธิผล' : 'ประสิทธิภาพ'}</p>
                        <p>หน่วยและฐานการวัด: ${user(metric.unit)} / ${user(metric.basis)}</p>
                        <p>สถานะข้อมูล: ${esc(Q.dataStatuses[input?.status]?.[0] || 'ยังไม่ระบุสถานะข้อมูล')}</p>
                        ${metric.definition ? `<p>นิยามความสำเร็จ: ${user(metric.definition)}</p>` : ''}
                        ${reference ? `<p>${user(reference)}</p>` : ''}
                        ${metric.category === 'effectiveness' || Q.finite(metric.target) ? `<p>เกณฑ์เป้าหมาย: ${target}</p>` : ''}
                        ${result.available ? `<p>ร้อยละการเปลี่ยนแปลงจากค่าเดิม: ${result.percent === null ? 'คำนวณไม่ได้เมื่อค่าก่อนเป็นศูนย์' : fmt(result.percent) + '%'}</p>` : `<p>${esc(result.reason)}</p>`}
                    </details>
                </th>
                <td>${formatValue(before)}</td><td>${formatValue(after)}</td><td>${changeText}</td>
                <td>${[outcome,goal].filter(Boolean).map(text => `<span>${esc(text)}</span>`).join('') || '—'}</td>
            </tr>`;
        });
        return `<div class="q-review-table" tabindex="0" role="region" aria-label="สรุปผลตัวชี้วัด">
            <table><thead><tr><th scope="col">ตัวชี้วัด</th><th scope="col">ก่อนใช้</th><th scope="col">หลังใช้</th>
                <th scope="col">การเปลี่ยนแปลง</th><th scope="col">ผล</th></tr></thead>
                <tbody>${rows.join('') || '<tr><td colspan="5">ไม่มีตัวชี้วัดที่เปิดใช้งาน</td></tr>'}</tbody></table>
        </div>`;
    }
    function wizard() {
        let draft = Q.draft() || { id:uid(), step:0, profile:{}, systemId:'', config:null, durations:{before:{},after:{}}, values:{} };
        const updatedConfig = Q.normalizeOutcome(draft.config);
        if (updatedConfig !== draft.config) {
            draft.config = updatedConfig;
            const previous = draft.values.outcome;
            if (previous && !previous.counts && ['known','after-only'].includes(previous.status)) {
                draft.legacyOutcome = previous;
                draft.values.outcome = {status:previous.status,before:null,after:null};
            }
            if (draft.step === 4 && draft.config.metrics.some(metric => metric.id === 'outcome' && metric.active)) draft.step = 3;
        }
        draft.durationStatuses ||= { before:{}, after:{} };
        if (!draft.systemId) {
            const requested = new URLSearchParams(location.search).get('system');
            if (systems.some(s => s.id === requested)) { draft.systemId = requested; draft.config = Q.config(requested); }
        }
        let sending = false, submitted = false;
        const steps = ['ข้อมูลผู้ประเมิน','กระบวนการก่อนใช้ IT','กระบวนการหลังใช้ IT','ตัวชี้วัด','ตรวจสอบและส่ง'];
        if (!draft.profile.name) {
            try { const profile = JSON.parse(sessionStorage.getItem('evaluatorProfile') || 'null'); if (profile) draft.profile = { name:profile.name || profile.evaluatorName || '', role:profile.role || profile.userRole || '', department:'' }; } catch (_) { /* Optional session profile. */ }
        }
        function derived() {
            if (!draft.config) return;
            for (const metric of draft.config.metrics.filter(m => m.source !== 'manual')) {
                const values = {};
                let known = true;
                for (const phase of ['before','after']) {
                    const items = draft.config[phase].filter(s => s.active);
                    if (!items.length) { known = false; continue; }
                    if (metric.source === 'steps') values[phase] = items.length;
                    else {
                        const timed = items.filter(s => s.timed);
                        if (!timed.length || timed.some(s => !Q.finite(draft.durations[phase][s.id]))) known = false;
                        else values[phase] = timed.reduce((sum,s) => sum + draft.durations[phase][s.id],0);
                    }
                }
                draft.values[metric.id] = { status:known ? 'known' : 'unknown', before:known ? values.before : null, after:known ? values.after : null };
            }
        }
        function capture() {
            if (draft.step === 0) {
                draft.profile = { name:document.getElementById('q-name').value.trim(), role:document.getElementById('q-role').value, department:document.getElementById('q-department').value.trim() };
                const id = document.getElementById('q-system').value;
                if (id !== draft.systemId) { draft.systemId=id; draft.config=id ? Q.config(id) : null; draft.durations={before:{},after:{}}; draft.durationStatuses={before:{},after:{}}; draft.values={}; }
            } else if (draft.step === 1 || draft.step === 2) {
                const phase = draft.step === 1 ? 'before' : 'after';
                draft.config[phase].filter(s => s.active && s.timed).forEach(s => { const input=document.getElementById(`duration-${s.id}`); const status=document.getElementById(`duration-status-${s.id}`).value; draft.durationStatuses[phase][s.id]=status; draft.durations[phase][s.id]=status==='known'?num(input.value):null; });
            } else if (draft.step === 3) {
                draft.config.metrics.filter(m => m.active && m.source === 'manual').forEach(m => {
                    const status=document.getElementById(`status-${m.id}`).value;
                    const value = {status, before:null, after:null};
                    const phases = Q.dataPhases(status);
                    for (const phase of phases) {
                        if (m.input === 'ratio') {
                            const success = num(document.getElementById(`${phase}-${m.id}-success`).value);
                            const total = num(document.getElementById(`${phase}-${m.id}-total`).value);
                            (value.counts ||= {})[phase] = {success,total};
                            value[phase] = Q.rate(success,total);
                            const start = document.getElementById(`${phase}-${m.id}-period-start`);
                            if (start) (value.periods ||= {})[phase] = {
                                start:start.value,
                                ...(m.periodMode === 'custom' ? {end:document.getElementById(`${phase}-${m.id}-period-end`).value} : {})
                            };
                        } else {
                            value[phase] = num(document.getElementById(`${phase}-${m.id}`).value);
                        }
                    }
                    draft.values[m.id] = value;
                });
            }
            derived();
        }
        function validate() {
            app.querySelectorAll('[aria-invalid=true]').forEach(el => el.setAttribute('aria-invalid', 'false'));
            app.querySelectorAll('.q-error').forEach(el => { el.textContent = ''; });
            document.getElementById('q-message').textContent = '';
            let valid=true;
            const fail=(id,message) => { valid=false; error(id,message); };
            if (draft.step === 0) {
                if (!draft.profile.name) fail('q-name','กรุณากรอกชื่อหรือนามสมมุติ');
                if (!['student','teacher','staff'].includes(draft.profile.role)) fail('q-role','กรุณาเลือกประเภทผู้ประเมิน');
                if (!draft.profile.department) fail('q-department','กรุณากรอกหน่วยงาน');
                if (!systems.some(s => s.id === draft.systemId)) fail('q-system','กรุณาเลือกระบบ IT');
            }
            if (draft.step === 1 || draft.step === 2) {
                const phase=draft.step === 1 ? 'before' : 'after';
                if (!draft.config[phase].some(s=>s.active)) { document.getElementById('q-message').textContent='ยังไม่กำหนดกระบวนการ กรุณาให้ผู้ดูแลตั้งค่าก่อน'; return false; }
                draft.config[phase].filter(s=>s.active && s.timed).forEach(s => { if (draft.durationStatuses[phase][s.id]==='known' && !Q.finite(draft.durations[phase][s.id])) fail(`duration-${s.id}`,'กรุณาระบุเวลาตั้งแต่ 0 ขึ้นไป หรือเลือกไม่ทราบข้อมูล'); });
            }
            if (draft.step === 3) draft.config.metrics.filter(m=>m.active && m.source==='manual').forEach(m=>{
                const value=draft.values[m.id];
                if (!['known','after-only','unknown','na'].includes(value.status) && m.required) fail(`status-${m.id}`,'กรุณาเลือกสถานะข้อมูล');
                const phases = Q.dataPhases(value.status);
                for (const phase of phases) {
                    const number = value[phase];
                    if (m.input === 'ratio' && Object.hasOwn(Q.periods,m.periodMode) && !Q.periodBounds(m.periodMode,value.periods?.[phase])) {
                        fail(`${phase}-${m.id}-period-start`,'กรุณาระบุช่วงเวลาอ้างอิงให้ครบและถูกต้อง');
                    }
                    if (m.input === 'ratio' && number === null) {
                        const {success,total} = value.counts[phase];
                        if (!Number.isSafeInteger(total) || total <= 0) fail(`${phase}-${m.id}-total`, 'กรอกจำนวนงานทั้งหมดเป็นจำนวนเต็มมากกว่า 0 หรือเลือกไม่ทราบข้อมูล');
                        else if (!Number.isSafeInteger(success) || success < 0 || success > total) fail(`${phase}-${m.id}-success`, 'กรอกจำนวนงานสำเร็จเป็นจำนวนเต็มตั้งแต่ 0 และไม่เกินจำนวนงานทั้งหมด');
                    } else if (!Q.finite(number)) fail(`${phase}-${m.id}`, 'กรุณาระบุค่าตั้งแต่ 0 ขึ้นไป');
                    else if (m.unit === '%' && number > 100) fail(`${phase}-${m.id}`, 'ค่าร้อยละต้องไม่เกิน 100');
                    else if (['paper','errors'].includes(m.id) && !Number.isInteger(number)) fail(`${phase}-${m.id}`, 'กรุณาระบุจำนวนเต็ม');
                }
            });
            if (!valid) {
                document.getElementById('q-message').textContent = 'กรุณาตรวจสอบช่องที่มีข้อความแจ้งเตือนก่อนดำเนินการต่อ';
                app.querySelector('[aria-invalid=true]')?.focus();
            }
            return valid;
        }
        function render() {
            const step=draft.step;
            let body='';
            if (step===0) body = field('q-name','ชื่อ–นามสกุล / นามสมมุติ',draft.profile.name) + `<label for="q-role">ประเภทผู้ประเมิน<select id="q-role" aria-describedby="q-role-error"><option value="">เลือกประเภท</option>${[['student','นิสิต'],['teacher','อาจารย์'],['staff','บุคลากร']].map(([v,l])=>`<option value="${v}" ${draft.profile.role===v?'selected':''}>${l}</option>`).join('')}</select></label><small class="q-error" id="q-role-error"></small>` + field('q-department','หน่วยงาน / สังกัด',draft.profile.department) + `<label for="q-system">ระบบ IT<select id="q-system" aria-describedby="q-system-error">${systemOptions(draft.systemId)}</select></label><small class="q-error" id="q-system-error"></small>`;
            if (step===1 || step===2) {
                const phase=step===1?'before':'after', list=draft.config[phase].filter(s=>s.active);
                body=`<p>ฐานการวัดเวลา: ${user(draft.config.metrics.find(m=>m.source==='time')?.basis || 'ต่อคำขอ')} ใช้ฐานเดียวกันก่อนและหลัง</p>`;
                body+=list.length?list.map((s,i)=>`<section class="q-card"><h3>${i+1}. ${user(s.name)}</h3><p>${user(s.description)}</p>${s.timed?`<label>สถานะข้อมูลเวลา<select id="duration-status-${s.id}">${[['known','มีข้อมูล'],['unknown','ไม่ทราบข้อมูล'],['na','ไม่เกี่ยวข้อง']].map(([v,l])=>`<option value="${v}" ${(draft.durationStatuses[phase][s.id]||'known')===v?'selected':''}>${l}</option>`).join('')}</select></label>`+field(`duration-${s.id}`,'เวลาที่ใช้ (นาที)',draft.durations[phase][s.id],'number'):'<p>ขั้นตอนนี้ไม่เก็บเวลา</p>'}</section>`).join(''):'<section class="q-card"><h3>ระบบนี้ยังไม่ได้กำหนดกระบวนการ</h3><p>ยังเริ่มประเมินจริงไม่ได้ หากผู้ดูแลตั้งค่าไว้แล้ว ให้โหลดการตั้งค่าล่าสุด หรือเลือกใช้กระบวนการตัวอย่างเพื่อทดลองกรอกฟอร์ม โดยจะระบุผลว่าเป็นข้อมูลจำลอง</p><button type="button" id="q-refresh-config">โหลดการตั้งค่าล่าสุด</button><button type="button" id="q-use-demo">ใช้กระบวนการตัวอย่าง (ข้อมูลจำลอง)</button></section>';
                const timed=list.filter(s=>s.timed), known=timed.length && timed.every(s=>Q.finite(draft.durations[phase][s.id]));
                body+=`<p id="duration-total">เวลารวม: ${known?fmt(timed.reduce((sum,s)=>sum+draft.durations[phase][s.id],0))+' นาที':'ยังมีข้อมูลไม่ครบ / ไม่ได้เก็บเวลา'}</p>`;
            }
            if (step===3) body=draft.config.metrics.filter(m=>m.active).map(m=>{
                const v=draft.values[m.id] || {};
                if(m.source!=='manual') return `<section class="q-card"><h3>${user(m.name)}</h3><p>คำนวณจากกระบวนการ · ${user(m.basis)} · ก่อน ${fmt(v.before)} / หลัง ${fmt(v.after)} ${user(m.unit)}</p></section>`;
                const inputs = ['before','after'].map(phase => {
                    const label = phase === 'before' ? 'ก่อนใช้ระบบ' : 'หลังใช้ระบบ';
                    const id = `${phase}-${m.id}`;
                    const fields = m.input === 'ratio'
                        ? field(id+'-total', 'จำนวนงานทั้งหมด', v.counts?.[phase]?.total, 'number') +
                          field(id+'-success', 'จำนวนงานที่สำเร็จ', v.counts?.[phase]?.success, 'number') +
                          referenceFields(m,phase,v.periods?.[phase]) +
                          `<p class="q-ratio-rate" id="${id}-rate" role="status"></p>`
                        : field(id, label+' ('+m.unit+')', v[phase], 'number');
                    return `<div id="${id}-fields" ${Q.dataPhases(v.status).includes(phase)?'':'hidden'}
                        ${m.input === 'ratio' ? `class="q-ratio-phase q-ratio-phase--${phase}" role="group" aria-labelledby="${id}-title"` : ''}>
                        ${m.input === 'ratio' ? `<h4 id="${id}-title">${label}</h4>` : ''}${fields}</div>`;
                }).join('');
                const goal = `<p id="goal-${m.id}" role="status"></p>`;
                const comparison = m.input === 'ratio'
                    ? `<div class="q-ratio-comparison"><p id="delta-${m.id}" role="status"></p>${goal}</div>`
                    : goal;
                return `<section class="q-card"><h3>${user(m.name)} ${m.required?'(จำเป็นต้องระบุสถานะข้อมูล)':''}</h3><p>${user(m.description)} ${m.input === 'ratio' ? '· '+(Q.periods[m.periodMode] || 'ยังไม่ระบุช่วงเวลาข้อมูล')+' · ใช้ช่วงเวลาเดียวกันสำหรับจำนวนงานทั้งสองค่าในแต่ละฝั่ง และใช้นิยามความสำเร็จเดียวกันก่อน–หลัง' : ''} ${m.definition ? '· นิยามความสำเร็จ: ' + user(m.definition) : ''} · ${user(m.unit)} / ${user(m.basis)}</p><label for="status-${m.id}">สถานะข้อมูล<select id="status-${m.id}" aria-describedby="status-${m.id}-help status-${m.id}-error">${[['','เลือกสถานะ'],...Object.entries(Q.dataStatuses).map(([key,[label]])=>[key,label])].map(([key,label])=>`<option value="${key}" ${v.status===key?'selected':''}>${label}</option>`).join('')}</select></label><p id="status-${m.id}-help" aria-live="polite"></p><small class="q-error" id="status-${m.id}-error"></small><div class="${m.input === 'ratio' ? 'q-ratio-grid' : 'q-grid'}">${inputs}</div>${comparison}</section>`;
            }).join('');
            if (step===4) body=`<div class="q-review-context"><p>${user(draft.profile.name)} · ${{student:'นิสิต',teacher:'อาจารย์',staff:'บุคลากร'}[draft.profile.role]||esc(draft.profile.role)} · ${user(draft.profile.department)}</p><p>ระบบ ${user(draft.systemId)}</p>${['before','after'].map(phase=>`<h3>${phase==='before'?'ก่อน':'หลัง'}ใช้ IT</h3><ol>${draft.config[phase].filter(s=>s.active).map(s=>`<li>${user(s.name)}${s.timed && Q.finite(draft.durations[phase][s.id]) ? ' · '+fmt(draft.durations[phase][s.id])+' นาที' : ''}</li>`).join('')}</ol>`).join('')}</div>${reviewKpiTable(draft)}<p>ยังไม่บันทึกเป็นรายการที่ส่ง จนกว่าจะยืนยันในหน้าต่างถัดไป</p>`;
            if(step===0) {
                body='<p class="ev-required-note">ข้อมูลที่มีเครื่องหมาย * จำเป็นต้องกรอก</p><div class="q-profile-grid">'+body.replace(/(<label[^>]*>[\s\S]*?<\/label><small class="q-error"[^>]*><\/small>)/g,'<div class="q-field">$1</div>')+'</div>';
                body=body.replace(/(<label for="(?:q-name|q-role|q-department|q-system)">)([^<]+)/g,'$1$2 <span class="ev-required" aria-hidden="true">*</span>');
                body=body.replace(/id="(q-name|q-role|q-department|q-system)"/g,'id="$1" required aria-required="true"');
            }
            const previousStepper = document.getElementById('energy-stepper');
            const missingProcesses = (step===1 || step===2) && !draft.config[step===1?'before':'after'].some(s=>s.active);
            app.innerHTML=`${window.EnergyStepper.markup(steps, step)}${draft.config?.isDemo ? '<p class="prototype">กำลังทดลองด้วยกระบวนการตัวอย่าง ข้อมูลจำลองนี้ไม่ใช่ข้อมูลจริงของคณะ</p>' : ''}<section class="q-card"><h2 tabindex="-1" id="step-heading"><svg class="ev-step-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v17H5zM9 4V2h6v2M8 10h8M8 14h8M8 18h5"/></svg>ขั้นที่ ${step+1}: ${steps[step]}</h2><form id="wizard-form" novalidate>${body}<p id="q-message" role="status"></p><div class="q-form-actions"><button type="button" id="q-back" ${step===0?'disabled':''}>ย้อนกลับ</button><button type="button" id="q-save">บันทึกแบบร่าง</button><button class="primary" type="submit" ${missingProcesses?'disabled':''}>${step===4?'ตรวจสอบและยืนยัน':missingProcesses?'ยังไม่มีขั้นตอนให้ประเมิน':'ถัดไป'}</button></div></form></section><dialog id="confirm-dialog" aria-labelledby="confirm-title"><h2 id="confirm-title">กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนส่ง</h2><p>ข้อมูลทดลองจะเก็บเฉพาะเบราว์เซอร์นี้</p><button id="q-cancel">กลับไปตรวจสอบ</button><button class="primary" id="q-confirm">ยืนยันการส่งข้อมูล</button></dialog>`;
            const nextStepper = document.getElementById('energy-stepper');
            if (previousStepper && nextStepper && typeof nextStepper.replaceWith === 'function') {
                nextStepper.replaceWith(previousStepper);
                window.EnergyStepper.update(previousStepper, step, steps);
            }
            document.getElementById('q-use-demo')?.addEventListener('click',()=>safe(()=>{
                draft.config=Q.demoConfig(); draft.step=1;
                draft.durations={before:{},after:{}}; draft.durationStatuses={before:{},after:{}}; draft.values={};
                render(); Q.saveDraft(draft);
            }));
            document.getElementById('q-refresh-config')?.addEventListener('click',()=>safe(async()=>{
                const latest=Q.config(draft.systemId);
                if(!['before','after'].every(phase=>latest[phase].some(s=>s.active))){document.getElementById('q-message').textContent='ยังไม่มีการตั้งค่าครบทั้งก่อนและหลัง ใช้กระบวนการตัวอย่างเพื่อทดลอง หรือรอผู้ดูแลตั้งค่า';return;}
                draft.config=latest;draft.step=1;draft.durations={before:{},after:{}};draft.durationStatuses={before:{},after:{}};draft.values={};render();Q.saveDraft(draft);
            }));
            document.getElementById('q-back').onclick=()=>{capture(); draft.step--; render();};
            document.getElementById('q-save').onclick=()=>safe(()=>{capture(); Q.saveDraft(draft); document.getElementById('q-message').textContent='บันทึกแบบร่างในเบราว์เซอร์แล้ว';});
            document.getElementById('wizard-form').onsubmit=e=>{e.preventDefault();safe(()=>{capture(); if(!validate()) return; if(step<4){Q.saveDraft({...draft,step:draft.step+1});draft.step++;render();document.getElementById('step-heading').focus();} else {Q.saveDraft(draft);document.getElementById('confirm-dialog').showModal();}});};
            document.getElementById('q-cancel').onclick=()=>document.getElementById('confirm-dialog').close();
            document.getElementById('q-confirm').onclick=async()=>{
                if(sending || submitted)return; sending=true; document.getElementById('q-confirm').disabled=true;
                const ok=await safe(async()=>{await Q.submit({...draft, categoryId:systems.find(s=>s.id===draft.systemId)?.categoryId || 'all', submittedAt:new Date().toISOString(), kind:'prototype-user-entry'});submitted=true;return true;});
                if(ok) app.innerHTML=`<section class="q-card"><h2>บันทึกข้อมูลทดลองในเบราว์เซอร์แล้ว</h2><p>ข้อมูลอยู่ในเบราว์เซอร์นี้ เปิด Dashboard ด้วยที่อยู่เว็บเดียวกันเพื่อดูผล</p><a class="q-button" href="../../Satisfaction_Survey/admin/dashboard.html?dataset=${draft.config.isDemo?'demo':'real'}#quantitative-results">ดูผลที่ส่งใน Dashboard</a><a class="q-button" href="evaluation.html">เริ่มแบบประเมินใหม่</a><a class="q-button" href="../../Satisfaction_Survey/user/index.html">ประเมินความพึงพอใจ</a></section>`;
                else {sending=false;document.getElementById('q-confirm').disabled=false;document.getElementById('confirm-dialog').close();}
            };
            if(step===1||step===2) app.querySelectorAll('input[type=number]').forEach(input=>input.addEventListener('input',()=>{capture();const phase=step===1?'before':'after';const list=draft.config[phase].filter(s=>s.active&&s.timed);document.getElementById('duration-total').textContent='เวลารวม: '+(list.length&&list.every(s=>Q.finite(draft.durations[phase][s.id]))?fmt(list.reduce((sum,s)=>sum+draft.durations[phase][s.id],0))+' นาที':'ยังมีข้อมูลไม่ครบ');}));
            if(step===1||step===2) draft.config[step===1?'before':'after'].filter(s=>s.active&&s.timed).forEach(s=>{const select=document.getElementById(`duration-status-${s.id}`);const toggle=()=>{document.getElementById(`duration-${s.id}`).disabled=select.value!=='known';capture();const phase=step===1?'before':'after',timed=draft.config[phase].filter(item=>item.active&&item.timed);document.getElementById('duration-total').textContent='เวลารวม: '+(timed.length&&timed.every(item=>Q.finite(draft.durations[phase][item.id]))?fmt(timed.reduce((sum,item)=>sum+draft.durations[phase][item.id],0))+' นาที':'ยังมีข้อมูลไม่ครบ');};select.onchange=toggle;document.getElementById(`duration-${s.id}`).disabled=select.value!=='known';});
            if (step === 3) {
                const metrics = draft.config.metrics.filter(m=>m.active && m.source==='manual');
                const refreshRates = () => {
                    for (const metric of metrics) {
                        const goal = Q.effectiveness(metric,draft.values[metric.id]);
                        document.getElementById(`goal-${metric.id}`).textContent = goal === null ? '' : goal ? 'บรรลุเป้าหมาย' : 'ไม่บรรลุเป้าหมาย';
                        if (metric.input !== 'ratio') continue;
                        const value = draft.values[metric.id] || {};
                        for (const phase of ['before','after']) {
                            const rate = value[phase];
                            const output = document.getElementById(`${phase}-${metric.id}-rate`);
                            output.textContent = Q.finite(rate) ? `อัตราความสำเร็จ: ${fmt(rate)}%` : 'อัตราความสำเร็จ: —';
                        }
                        const result = Q.calculate(metric,value);
                        document.getElementById(`delta-${metric.id}`).textContent = result.available
                            ? `ผลต่าง: ${fmt(result.delta)} จุดเปอร์เซ็นต์`
                            : (Q.finite(value.before) && Q.finite(value.after) ? result.reason : '');
                    }
                };
                for (const metric of metrics) {
                    const select = document.getElementById(`status-${metric.id}`);
                    const toggle = () => {
                        document.getElementById(`status-${metric.id}-help`).textContent = Q.dataStatuses[select.value]?.[1] || '';
                        for (const phase of ['before','after']) {
                            const disabled = !Q.dataPhases(select.value).includes(phase);
                            document.getElementById(`${phase}-${metric.id}-fields`).hidden = disabled;
                            for (const suffix of metric.input === 'ratio' ? ['-success','-total','-period-start','-period-end'] : ['']) {
                                const input = document.getElementById(`${phase}-${metric.id}${suffix}`);
                                if (input) input.disabled = disabled;
                            }
                        }
                    };
                    select.onchange = toggle;
                    toggle();
                }
                document.getElementById('wizard-form').oninput = () => safe(()=>{
                    capture();
                    refreshRates();
                    Q.saveDraft(draft);
                });
                refreshRates();
            }
        }
        render();
    }
    function admin() {
        const requested = new URLSearchParams(location.search).get('system');
        let selected=systems.some(s=>s.id===requested)?requested:'', config=selected?Q.config(selected):null;
        const openSteps = new Set();
        let dirty = false;
        window.addEventListener('beforeunload', event=>{
            if(!dirty)return;
            event.preventDefault();
            event.returnValue='';
        });
        const sources=[['time','รวมเวลาขั้นตอน'],['steps','นับขั้นตอนที่เปิดใช้งาน'],['manual','กรอกก่อนและหลัง']];
        function confirmChange(message, onConfirm, confirmLabel = 'ยืนยัน') {
            const dialog=document.getElementById('q-admin-confirm');
            dialog.querySelector('p').textContent=message;
            dialog.querySelector('[value=confirm]').textContent=confirmLabel;
            dialog.returnValue='';
            dialog.addEventListener('close',()=>{
                if(dialog.returnValue==='confirm')safe(onConfirm);
            },{once:true});
            dialog.showModal();
        }
        document.addEventListener('click', event=>{
            const back=event.target.closest('#q-admin-dashboard-back');
            if(!back || !dirty || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
            event.preventDefault();
            confirmChange('คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้หรือไม่?',()=>{
                dirty=false;
                location.assign(back.href);
            },'ออกโดยไม่บันทึก');
        });
        function processCard(phase, step, index) {
            const prefix = `${phase}-${index}`;
            return `<details class="q-process" data-phase="${phase}" data-index="${index}" ${openSteps.has(step.id)?'open':''}>
                <summary><span>ขั้นตอน ${index+1} · <span data-step-name>${user(step.name || 'ยังไม่ระบุชื่อ')}</span></span>
                    <small data-step-status>${processStatus(step.active, step.timed)}</small></summary>
                <div class="q-process-fields">
                    ${field(prefix+'-name','ชื่อขั้นตอน (จำเป็น)',step.name)}
                    ${field(prefix+'-description','รายละเอียด (ไม่บังคับ)',step.description)}
                    <label><input type="checkbox" data-prop="active" ${step.active?'checked':''}> เปิดใช้งาน</label>
                    <label><input type="checkbox" data-prop="timed" ${step.timed?'checked':''}> ต้องกรอกเวลา</label>
                    <button type="button" data-order="-1" title="เลื่อนขึ้น" aria-label="เลื่อนขึ้น" ${index===0?'disabled':''}>▲</button>
                    <button type="button" data-order="1" title="เลื่อนลง" aria-label="เลื่อนลง" ${index===config[phase].length-1?'disabled':''}>▼</button>
                    <button type="button" data-delete-step>ลบขั้นตอน</button>
                </div>
            </details>`;
        }
        function processStatus(active, timed) {
            return `${active?'เปิดใช้งาน':'ปิดใช้งาน'} · ${timed?'ต้องกรอกเวลา':'ไม่ต้องกรอกเวลา'}`;
        }
        function render() {
            app.innerHTML=`<label>ระบบ IT<select id="admin-system">${systemOptions(selected)}</select></label><p id="q-message" role="status"></p>${!config?'เลือก IT เพื่อกำหนดแบบประเมิน':''}<div id="config-editor"></div>`;
            app.insertAdjacentHTML('beforeend','<dialog id="q-admin-confirm" aria-labelledby="q-admin-confirm-message"><form method="dialog"><p id="q-admin-confirm-message"></p><button value="cancel" autofocus>ยกเลิก</button><button value="confirm" class="primary">ยืนยัน</button></form></dialog>');
            const systemSelect=document.getElementById('admin-system');
            systemSelect.onchange=()=>{
                const next=systemSelect.value;
                systemSelect.value=selected;
                const change=()=>{
                    const nextConfig=next?Q.config(next):null;
                    selected=next;
                    config=nextConfig;
                    dirty=false;
                    openSteps.clear();
                    render();
                };
                if(dirty)confirmChange('ละทิ้งการแก้ไขที่ยังไม่ได้บันทึกและเปลี่ยนระบบ IT หรือไม่?',change);
                else safe(change);
            };
            if(!config)return;
            const editor=document.getElementById('config-editor');
            editor.innerHTML=`<div class="q-admin-columns">${['before','after'].map(phase=>`<section class="q-card"><h2>กระบวนการ${phase==='before'?'ก่อน':'หลัง'}ใช้ระบบ</h2><div>${config[phase].map((step,index)=>processCard(phase,step,index)).join('')}</div><button type="button" class="primary q-add-step" data-add-phase="${phase}">+ เพิ่มขั้นตอน</button></section>`).join('')}</div><section class="q-card q-kpi">
                <header><div><h2>จัดการตัวชี้วัด (KPI)</h2><p>กำหนดตัวชี้วัดตามระบบ IT ที่เลือก</p></div>
                    <button type="button" id="add-metric" class="primary">+ เพิ่มตัวชี้วัดใหม่</button>
                </header>
                <div class="q-kpi-scroll" tabindex="0" role="region" aria-label="ตารางตัวชี้วัด">
                    <table><thead><tr><th>ชื่อตัวชี้วัด</th><th>วิธีคำนวณ</th><th>หน่วย / ฐานการวัด</th><th>ทิศทางเป้าหมาย</th><th>เปิดใช้งาน</th><th>จัดการ</th></tr></thead>
                    <tbody>${config.metrics.map((m,i)=>`<tr>
                        <td><strong data-kpi-name="${i}">${user(m.name || 'ยังไม่ระบุชื่อ')}</strong><small>${user(m.description)}</small></td>
                        <td>${sources.find(([value])=>value===m.source)?.[1] || 'กรอกก่อนและหลัง'}</td>
                        <td><span>${user(m.unit)}</span><small>${user(m.basis)}</small></td>
                        <td><span class="q-kpi-direction" data-direction="${esc(m.direction)}">${({decrease:'↓ ลดลงยิ่งดี',increase:'↑ เพิ่มขึ้นยิ่งดี',target:'◎ เทียบเป้าหมาย'})[m.direction] || 'ยังไม่กำหนด'}</span></td>
                        <td><input type="checkbox" data-kpi-active="${i}" aria-label="เปิดใช้งานตัวชี้วัดรายการที่ ${i+1}" ${m.active?'checked':''}></td>
                        <td><button type="button" data-kpi-edit="${i}" aria-expanded="false" aria-controls="q-kpi-edit-${i}">แก้ไข</button></td>
                    </tr><tr id="q-kpi-edit-${i}" hidden><td colspan="6"><fieldset class="q-kpi-fields" data-metric="${i}"><legend>${user(m.name)}</legend>
                        ${m.custom === true ? `
                            ${field(`m-${i}-name`,'ชื่อตัวชี้วัด',m.name)}
                            ${field(`m-${i}-description`,'คำอธิบาย',m.description)}
                            ${field(`m-${i}-unit`,'หน่วยวัด',m.unit)}
                            <label>มิติการประเมิน<select data-prop="category">
                                <option value="efficiency">ประสิทธิภาพ</option>
                                <option value="effectiveness" ${m.category==='effectiveness'?'selected':''}>ประสิทธิผล</option>
                            </select></label>
                            <label>ทิศทางที่ดีขึ้น<select data-prop="direction">
                                <option value="decrease">ลดลงยิ่งดี</option>
                                <option value="increase" ${m.direction==='increase'?'selected':''}>เพิ่มขึ้นยิ่งดี</option>
                            </select></label>` : ''}
                        <p>${m.category === 'effectiveness' ? 'ประสิทธิผล' : 'ประสิทธิภาพ'} · ${user(m.unit)} · ${user(m.description)}</p>
                        ${m.input === 'ratio' ? field(`m-${i}-definition`,'นิยามความสำเร็จ',m.definition) : ''}
                        ${m.input === 'ratio' ? `<label>ช่วงเวลาของข้อมูล<select data-prop="period-mode">
                            <option value="">ยังไม่ระบุช่วงเวลาข้อมูล</option>
                            ${Object.entries(Q.periods).map(([key,label])=>`<option value="${key}" ${m.periodMode===key?'selected':''}>${label}</option>`).join('')}
                        </select></label>` : ''}
                        ${field(`m-${i}-basis`,'ฐานการวัดเดียวกันก่อนและหลัง',m.basis)}
                        ${m.custom === true ? field(`m-${i}-target`,'เป้าหมายประสิทธิผล (ตามทิศทางที่เลือก)',m.target,'number') : m.category === 'effectiveness' ? field(`m-${i}-target`,m.direction === 'increase' ? 'เป้าหมายขั้นต่ำ' : 'เป้าหมายสูงสุด',m.target,'number') : ''}
                        <label><input data-prop="active" type="checkbox" ${m.active?'checked':''}> เปิดใช้งานกับระบบนี้</label>
                        ${m.custom === true ? `<button type="button" data-delete-metric="${i}">ลบตัวชี้วัดเพิ่มเติม</button>` : ''}</fieldset></td></tr>`).join('') || '<tr><td colspan="6">ยังไม่มีตัวชี้วัด</td></tr>'}</tbody></table>
                </div></section><div class="q-admin-actions"><button id="save-config" class="primary">บันทึกการตั้งค่า</button><button id="restore-config" type="button">คืนค่าเดิม</button><button id="preview-config">ดูตัวอย่างแบบฟอร์ม</button></div><section id="preview" class="q-card" hidden></section>`;
            const readiness = document.createElement('section');
            readiness.className = 'q-card';
            const activeBefore = config.before.filter(s=>s.active).length;
            const activeAfter = config.after.filter(s=>s.active).length;
            readiness.innerHTML = `<h2>ความพร้อมของแบบประเมิน ${esc(selected)}</h2><div class="q-admin-summary" aria-live="polite"></div><p>${activeBefore && activeAfter ? 'มีกระบวนการครบทั้งสองช่วง สามารถเปิดแบบประเมินเพื่อตรวจสอบได้' : 'ยังไม่พร้อมประเมิน กรุณาเพิ่มและเปิดใช้งานกระบวนการอย่างน้อยช่วงละ 1 ขั้นตอน แล้วบันทึก'}</p><p>เมื่อบันทึกแล้ว ให้เปิดแบบประเมินใหม่ หากมีแบบร่างเดิมที่ไม่มีกระบวนการ ให้กดโหลดการตั้งค่าล่าสุดในขั้นที่ 2</p><a class="q-button" href="evaluation.html?system=${encodeURIComponent(selected)}">เปิดแบบประเมินของระบบนี้</a><a class="q-button" href="../../Satisfaction_Survey/admin/dashboard.html#quantitative-results">ตรวจสอบผลที่ส่งแล้ว</a>`;
            function updateSummary() {
                const before=editor.querySelectorAll('[data-phase="before"] [data-prop="active"]:checked').length;
                const after=editor.querySelectorAll('[data-phase="after"] [data-prop="active"]:checked').length;
                const metrics=editor.querySelectorAll('[data-metric] [data-prop="active"]:checked').length;
                const reduction=before ? ((before-after)/before*100).toFixed(2)+'%' : 'ไม่มีข้อมูลเพียงพอ';
                const tone=before && before!==after ? (before>after?'decrease':'increase') : 'neutral';
                readiness.querySelector('.q-admin-summary').innerHTML=`
                    <div>ก่อนใช้ IT <strong>${before}</strong></div><div>หลังใช้ IT <strong>${after}</strong></div>
                    <div data-tone="${tone}">การลดจำนวนขั้นตอน <strong>${reduction}</strong></div>
                    <div>ตัวชี้วัดที่เปิดใช้ <strong>${metrics}</strong></div>`;
            }
            editor.oninput=event=>{
                dirty=true;
                if(event.target.matches('[data-prop="active"]'))updateSummary();
            };
            updateSummary();
            document.getElementById('restore-config').onclick=()=>confirmChange('คืนการตั้งค่าที่บันทึกล่าสุดของระบบนี้หรือไม่?',()=>{
                config=Q.config(selected);
                dirty=false;
                openSteps.clear();
                render();
            });
            editor.prepend(readiness);
            function capture() {
                editor.querySelectorAll('[data-phase]').forEach(row=>{const {phase,index}=row.dataset,s=config[phase][index];for(const key of ['name','description']){const value=document.getElementById(`${phase}-${index}-${key}`).value;if(value!==String(s[key]??''))s[key]=value.trim();}['active','timed'].forEach(k=>s[k]=row.querySelector(`[data-prop=${k}]`).checked);});
                editor.querySelectorAll('[data-metric]').forEach(row=>{
                    const i=row.dataset.metric, metric=config.metrics[i];
                    if (metric.custom === true) {
                        for (const key of ['name','description','unit']) {
                            metric[key] = document.getElementById(`m-${i}-${key}`).value.trim();
                        }
                        metric.category = row.querySelector('[data-prop=category]').value;
                        metric.direction = row.querySelector('[data-prop=direction]').value;
                    }
                    metric.basis=document.getElementById(`m-${i}-basis`).value.trim();
                    if (metric.input === 'ratio') {
                        metric.definition=document.getElementById(`m-${i}-definition`).value.trim();
                        const mode = row.querySelector('[data-prop=period-mode]').value;
                        if (mode) metric.periodMode=mode;
                        else delete metric.periodMode;
                    }
                    if (metric.custom === true || metric.category === 'effectiveness') metric.target=num(document.getElementById(`m-${i}-target`).value);
                    metric.active=row.querySelector('[data-prop=active]').checked;
                });
            }
            editor.querySelectorAll('[data-phase]').forEach(card=>{
                const {phase,index}=card.dataset;
                const step=config[phase][index];
                const name=card.querySelector(`#${phase}-${index}-name`);
                card.ontoggle=()=>card.open?openSteps.add(step.id):openSteps.delete(step.id);
                card.oninput=()=>{
                    card.querySelector('[data-step-name]').textContent=name.value.trim() || 'ยังไม่ระบุชื่อ';
                    card.querySelector('[data-step-status]').textContent=processStatus(
                        card.querySelector('[data-prop=active]').checked,
                        card.querySelector('[data-prop=timed]').checked
                    );
                };
                card.querySelectorAll('[data-order]').forEach(button=>button.onclick=()=>{
                    capture();
                    const list=config[phase], from=Number(index), to=from+Number(button.dataset.order);
                    list.splice(to,0,list.splice(from,1)[0]);
                    dirty=true;
                    render();
                    editorFocus(phase,to);
                });
                card.querySelector('[data-delete-step]').onclick=()=>confirmChange(`ลบขั้นตอน “${name.value.trim() || 'ยังไม่ระบุชื่อ'}” หรือไม่? การเปลี่ยนแปลงจะมีผลเมื่อบันทึกการตั้งค่า`,()=>{
                    dirty=true;
                    capture();
                    config[phase].splice(Number(index),1);
                    openSteps.delete(step.id);
                    render();
                    editorFocus(phase,index);
                });
            });
            function editorFocus(phase,index) {
                const next=document.querySelector(`[data-phase="${phase}"][data-index="${index}"] summary`);
                (next || document.querySelector(`[data-add-phase="${phase}"]`)).focus();
            }
            editor.querySelectorAll('[data-add-phase]').forEach(button=>button.onclick=()=>{
                capture();
                const phase=button.dataset.addPhase;
                const step={id:uid(),name:'',description:'',active:true,timed:true};
                const index=config[phase].push(step)-1;
                openSteps.add(step.id);
                dirty=true;
                render();
                const name=document.getElementById(`${phase}-${index}-name`);
                name.focus({preventScroll:true});
                name.scrollIntoView({block:'nearest'});
            });
            function showMetric(index, open) {
                const row=document.getElementById(`q-kpi-edit-${index}`);
                row.hidden=!open;
                editor.querySelector(`[data-kpi-edit="${index}"]`).setAttribute('aria-expanded',String(open));
            }
            editor.querySelectorAll('[data-kpi-edit]').forEach(button=>{
                button.onclick=()=>showMetric(button.dataset.kpiEdit,button.getAttribute('aria-expanded')==='false');
            });
            editor.querySelectorAll('[data-kpi-active]').forEach(toggle=>{
                const field=editor.querySelector(`[data-metric="${toggle.dataset.kpiActive}"] [data-prop="active"]`);
                toggle.oninput=()=>{
                    field.checked=toggle.checked;
                    dirty=true;
                    updateSummary();
                };
                field.oninput=()=>{toggle.checked=field.checked;};
            });
            document.getElementById('add-metric').onclick=()=>{
                capture();
                const index = config.metrics.push({
                    id:uid(), custom:true, name:'', description:'', unit:'', basis:'',
                    category:'efficiency', source:'manual', direction:'decrease', active:true, required:true
                }) - 1;
                dirty=true;
                render();
                showMetric(index,true);
                document.getElementById(`m-${index}-name`).focus();
            };
            editor.querySelectorAll('[data-delete-metric]').forEach(button=>{
                button.onclick=()=>{
                    const index = Number(button.dataset.deleteMetric);
                    if (config.metrics[index]?.custom !== true) return;
                    confirmChange('ลบตัวชี้วัดเพิ่มเติมนี้หรือไม่? การเปลี่ยนแปลงจะมีผลเมื่อบันทึกการตั้งค่า',()=>{
                        capture();
                        config.metrics.splice(index,1);
                        dirty=true;
                        render();
                        document.getElementById('add-metric').focus();
                    });
                };
            });
            document.getElementById('save-config').onclick=()=>safe(async()=>{
                capture();let valid=true;
                editor.querySelectorAll('[aria-invalid=true]').forEach(el=>el.setAttribute('aria-invalid','false'));
                editor.querySelectorAll('.q-error').forEach(el=>{el.textContent='';});
                const missingPhases = ['before','after'].filter(phase=>!config[phase].some(s=>s.active));
                if(missingPhases.length) {
                    document.getElementById('q-message').textContent='ยังบันทึกไม่ได้: กรุณาเพิ่มและเปิดใช้งานขั้นตอน'+missingPhases.map(phase=>phase==='before'?'ก่อนใช้ IT':'หลังใช้ IT').join(' และ ')+' อย่างน้อยช่วงละ 1 ขั้นตอน';
                    return;
                }
                for(const phase of ['before','after']) config[phase].forEach((s,i)=>{if(s.active&&!s.name){document.getElementById(`${phase}-${i}-name`).closest('details').open=true;error(`${phase}-${i}-name`,'กรุณาระบุชื่อขั้นตอน');valid=false;}});
                config.metrics.forEach((metric,index)=>{
                    if (metric.custom === true) {
                        for (const key of ['name','unit','basis']) {
                            if (!metric[key]) { error(`m-${index}-${key}`,'กรุณากรอกข้อมูล'); valid=false; }
                        }
                    }
                    if (!metric.active) return;
                    if (!metric.basis) { error(`m-${index}-basis`,'กรุณาระบุฐานการวัด'); valid=false; }
                    if (metric.input === 'ratio' && !metric.definition) { error(`m-${index}-definition`,'กรุณาระบุนิยามความสำเร็จ'); valid=false; }
                    if (metric.category === 'effectiveness' && metric.target != null &&
                        (!Q.finite(metric.target) || (metric.unit === '%' && metric.target > 100))) {
                        error(`m-${index}-target`,'กรุณาระบุเป้าหมายในช่วงที่หน่วยวัดรองรับ'); valid=false;
                    }
                });
                if(!valid){
                    editor.querySelectorAll('[data-metric]').forEach(row=>{
                        if(row.querySelector('[aria-invalid=true]'))showMetric(row.dataset.metric,true);
                    });
                    document.getElementById('q-message').textContent='กรุณาตรวจสอบช่องที่มีข้อความแจ้งเตือนก่อนบันทึก';editor.querySelector('[aria-invalid=true]')?.focus();return;}
                const savedSystem=selected;
                const savedConfig=await Q.saveConfig(savedSystem,config);
                if(selected!==savedSystem)return;
                config=savedConfig;dirty=false;render();document.getElementById('q-message').textContent='บันทึกการตั้งค่าสำเร็จ แบบประเมินรอบใหม่จะอ่านการตั้งค่านี้';
            });
            document.getElementById('preview-config').onclick=()=>{capture();const p=document.getElementById('preview');p.hidden=false;p.innerHTML='<h2>ตัวอย่างแบบฟอร์ม (ยังไม่บันทึก)</h2>'+['before','after'].map(phase=>`<h3>${phase==='before'?'ก่อน':'หลัง'}</h3>`+config[phase].filter(s=>s.active).map(s=>`<p>${user(s.name)} · ${user(s.description)} ${s.timed?'[ช่องกรอกเวลา นาที]':''}</p>`).join('')).join('')+config.metrics.filter(m=>m.active).map(m=>`<p>${user(m.name)} — ${user(m.unit)} / ${user(m.basis)}</p>`).join('');};
        }
        render();
    }
    function dashboard() {
        const records=Q.records();
        const categories=[...new Set(systems.map(s=>s.categoryId || 'all'))];
        app.innerHTML=`<section class="q-card q-grid"><label>ระบบ IT<select id="filter-system"><option value="">ทุกระบบ</option>${systemOptions('').replace('<option value="">เลือกระบบ IT</option>','')}</select></label><label>หมวดหมู่<select id="filter-category"><option value="">ทุกหมวดหมู่</option>${categories.map(c=>`<option value="${esc(c)}">${esc(systems.find(s=>s.categoryId===c)?.categoryName || c)}</option>`).join('')}</select></label>${field('filter-start','ตั้งแต่วันที่','','date')}${field('filter-end','ถึงวันที่','','date')}</section><div id="results"></div>`;
        const exportButton=document.createElement('button');
        exportButton.type='button';exportButton.textContent='ดาวน์โหลดผลประเมิน JSON';
        app.prepend(exportButton);
        exportButton.onclick=()=>safe(()=>{
            const blob=new Blob([JSON.stringify(Q.records(),null,2)],{type:'application/json;charset=utf-8'});
            const url=URL.createObjectURL(blob),link=document.createElement('a');
            link.href=url;link.download='it-evaluations-'+new Date().toISOString().slice(0,10)+'.json';
            document.body.append(link);link.click();link.remove();
            setTimeout(()=>URL.revokeObjectURL(url),1000);
        });
        function render(){
            const system=document.getElementById('filter-system').value,category=document.getElementById('filter-category').value,start=document.getElementById('filter-start').value,end=document.getElementById('filter-end').value;
            const list=records.filter(r=>(!system||r.systemId===system)&&(!category||r.categoryId===category)&&(!start||r.submittedAt.slice(0,10)>=start)&&(!end||r.submittedAt.slice(0,10)<=end));
            const groups=new Map();
            list.forEach(r=>r.config.metrics.filter(m=>m.active).forEach(m=>{const v=r.values[m.id],result=Q.calculate(m,v);if(!result.available)return;const key=JSON.stringify([r.systemId,r.config.version,m.id,m.unit,m.basis,m.direction,m.target]);if(!groups.has(key))groups.set(key,{system:r.systemId,version:r.config.version,m,before:0,after:0,count:0});const g=groups.get(key);g.before+=v.before;g.after+=v.after;g.count++;}));
            document.getElementById('results').innerHTML=`<p>ระบบที่ได้รับการประเมิน ${new Set(list.map(r=>r.systemId)).size} ระบบ · ผลทดลอง ${list.length} รายการ</p><p>ค่าเฉลี่ยแยกตามระบบ เวอร์ชัน ตัวชี้วัด หน่วย และฐานการวัด ไม่รวมต่างหน่วยเป็นคะแนนเดียว</p>${[...groups.values()].map(g=>{const b=g.before/g.count,a=g.after/g.count,max=Math.max(b,a,1);return `<section class="q-card"><h3>${esc(g.system)} · ${user(g.m.name)}</h3><p>${user(g.m.unit)} / ${user(g.m.basis)} · ${g.count} รายการ · ค่าเฉลี่ยลดลง ${fmt(b-a)}</p><div class="q-bars">ก่อน ${fmt(b)} <span class="q-bar before" style="width:${b/max*60}%"></span></div><div class="q-bars">หลัง ${fmt(a)} <span class="q-bar" style="width:${a/max*60}%"></span></div></section>`;}).join('')}${list.length?list.map(r=>`<details class="q-card"><summary>${esc(r.systemId)} · ${esc(r.submittedAt.slice(0,10))}</summary>${resultTable(r)}</details>`).join(''):'<section class="q-card">ยังไม่มีผลประเมินตามเงื่อนไข</section>'}`;
        }
        app.querySelectorAll('input,select').forEach(el=>el.onchange=render);render();
    }
    safe(()=>{
        systems=Q.systems();
        if(page==='evaluation')wizard();else if(page==='admin')admin();else dashboard();
    });
})();
