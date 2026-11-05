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
    function resultTable(record) {
        const rows = record.config.metrics.filter(m => m.active).map(m => {
            const input = record.values[m.id], result = Q.calculate(m, input);
            return `<tr><th scope="row">${user(m.name)}<br><small>${user(m.unit)} / ${user(m.basis)}</small></th><td>${fmt(input?.before)}</td><td>${fmt(input?.after)}</td><td>${result.available ? fmt(result.delta) : '—'}</td><td>${result.available ? result.percent === null ? 'คำนวณเปอร์เซ็นต์ไม่ได้: ค่าเดิมเป็น 0' : fmt(result.percent) + '%' : esc(result.reason)}</td><td>${result.available ? esc(result.outcome) + (m.direction === 'target' ? ` · เป้าหมาย ${fmt(m.target)} (${result.targetMet ? 'ถึงเป้าหมาย' : 'ยังไม่ถึงเป้าหมาย'})` : '') : '—'}</td></tr>`;
        }).join('');
        return `${record.config.isDemo ? '<p class="prototype">ข้อมูลจำลองจากกระบวนการตัวอย่าง ไม่ใช่ผลประเมินจริงของระบบ IT</p>' : ''}<div class="q-table-wrap"><table><caption>ผลต่าง = ค่าใหม่ − ค่าเดิม · เปอร์เซ็นต์ติดลบหมายถึงค่าลดลง</caption><thead><tr><th>ตัวชี้วัด</th><th>ก่อน</th><th>หลัง</th><th>ผลต่าง</th><th>การเปลี่ยนแปลง</th><th>ผล</th></tr></thead><tbody>${rows}</tbody></table></div>${record.config.metrics.some(m => m.active && m.direction === 'target') ? '' : '<p>ยังไม่ได้กำหนดเกณฑ์ประสิทธิผล</p>'}`;
    }
    function wizard() {
        let draft = Q.draft() || { id:uid(), step:0, profile:{}, systemId:'', config:null, durations:{before:{},after:{}}, values:{} };
        draft.durationStatuses ||= { before:{}, after:{} };
        if (!draft.systemId) {
            const requested = new URLSearchParams(location.search).get('system');
            if (systems.some(s => s.id === requested)) { draft.systemId = requested; draft.config = Q.config(requested); }
        }
        let sending = false, submitted = false;
        const steps = ['ข้อมูลผู้ประเมิน','กระบวนการก่อนใช้ IT','กระบวนการหลังใช้ IT','ตัวชี้วัด','ตรวจสอบและส่ง'];
        if (!draft.profile.name) {
            try { const profile = JSON.parse(sessionStorage.getItem('evaluatorProfile') || 'null'); if (profile) draft.profile = { id:profile.id || '', name:profile.name || profile.evaluatorName || '', role:profile.role || profile.userRole || '', department:'' }; } catch (_) { /* Optional session profile. */ }
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
                const profile = window.EvaluatorAuth?.current() || {};
                draft.profile = { id:profile.id || '', name:profile.name || '', role:profile.role || '', department:'' };
                const id = document.getElementById('q-system').value;
                if (id !== draft.systemId) { draft.systemId=id; draft.config=id ? Q.config(id) : null; draft.durations={before:{},after:{}}; draft.durationStatuses={before:{},after:{}}; draft.values={}; }
            } else if (draft.step === 1 || draft.step === 2) {
                const phase = draft.step === 1 ? 'before' : 'after';
                draft.config[phase].filter(s => s.active && s.timed).forEach(s => { const input=document.getElementById(`duration-${s.id}`); const status=document.getElementById(`duration-status-${s.id}`).value; draft.durationStatuses[phase][s.id]=status; draft.durations[phase][s.id]=status==='known'?num(input.value):null; });
            } else if (draft.step === 3) {
                draft.config.metrics.filter(m => m.active && m.source === 'manual').forEach(m => {
                    const status=document.getElementById(`status-${m.id}`).value;
                    draft.values[m.id] = { status, before:status === 'known' ? num(document.getElementById(`before-${m.id}`).value) : null, after:status === 'known' ? num(document.getElementById(`after-${m.id}`).value) : null };
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
                if (!draft.profile.id || !draft.profile.name) { document.getElementById('q-message').textContent='ไม่พบข้อมูลบัญชี กรุณาเข้าสู่ระบบใหม่'; return false; }
                if (!systems.some(s => s.id === draft.systemId)) fail('q-system','กรุณาเลือกระบบ IT');
            }
            if (draft.step === 1 || draft.step === 2) {
                const phase=draft.step === 1 ? 'before' : 'after';
                if (!draft.config[phase].some(s=>s.active)) { document.getElementById('q-message').textContent='ยังไม่กำหนดกระบวนการ กรุณาให้ผู้ดูแลตั้งค่าก่อน'; return false; }
                draft.config[phase].filter(s=>s.active && s.timed).forEach(s => { if (draft.durationStatuses[phase][s.id]==='known' && !Q.finite(draft.durations[phase][s.id])) fail(`duration-${s.id}`,'กรุณาระบุเวลาตั้งแต่ 0 ขึ้นไป หรือเลือกไม่ทราบข้อมูล'); });
            }
            if (draft.step === 3) draft.config.metrics.filter(m=>m.active && m.source==='manual').forEach(m=>{
                const value=draft.values[m.id];
                if (!['known','unknown','na'].includes(value.status) && m.required) fail(`status-${m.id}`,'กรุณาเลือกสถานะข้อมูล');
                if (value.status==='known') for (const phase of ['before','after']) if (!Q.finite(value[phase]) || (['paper','errors'].includes(m.id) && !Number.isInteger(value[phase]))) fail(`${phase}-${m.id}`,'กรุณาระบุค่าที่ไม่ติดลบ และใช้จำนวนเต็มสำหรับกระดาษ/ข้อผิดพลาด');
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
            if (step===0) {
                const profile=window.EvaluatorAuth?.current() || {};
                body=`<p class="q-account-summary">ผู้ประเมิน: <strong>${user(profile.name || draft.profile.name)}</strong> · ID ${user(profile.id || draft.profile.id)} · ${user(profile.role || draft.profile.role)}</p><label for="q-system">ระบบ IT<select id="q-system" aria-describedby="q-system-error">${systemOptions(draft.systemId)}</select></label><small class="q-error" id="q-system-error"></small>`;
            }
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
                return `<section class="q-card"><h3>${user(m.name)} ${m.required?'(จำเป็นต้องระบุสถานะข้อมูล)':''}</h3><p>${user(m.description)} · ${user(m.unit)} / ${user(m.basis)}</p><label for="status-${m.id}">สถานะข้อมูล<select id="status-${m.id}" aria-describedby="status-${m.id}-error">${[['','เลือกสถานะ'],['known','มีข้อมูล'],['unknown','ไม่ทราบข้อมูล'],['na','ไม่เกี่ยวข้อง']].map(([key,label])=>`<option value="${key}" ${v.status===key?'selected':''}>${label}</option>`).join('')}</select></label><small class="q-error" id="status-${m.id}-error"></small><div class="q-grid">${field(`before-${m.id}`,'ก่อนใช้ระบบ',v.before,'number')}${field(`after-${m.id}`,'หลังใช้ระบบ',v.after,'number')}</div></section>`;
            }).join('');
            if (step===4) body=`<p>${user(draft.profile.name)} · ${{student:'นิสิต',teacher:'อาจารย์',staff:'บุคลากร'}[draft.profile.role]||esc(draft.profile.role)} · ${user(draft.profile.department)}</p><p>ระบบ ${user(draft.systemId)} · แบบประเมินเวอร์ชัน ${draft.config.version}</p>${['before','after'].map(phase=>`<h3>${phase==='before'?'ก่อน':'หลัง'}ใช้ IT</h3><ol>${draft.config[phase].filter(s=>s.active).map(s=>`<li>${user(s.name)} — ${user(s.description)} ${s.timed?fmt(draft.durations[phase][s.id])+' นาที':'ไม่เก็บเวลา'}</li>`).join('')}</ol>`).join('')}${resultTable(draft)}<p>ยังไม่บันทึกเป็นรายการที่ส่ง จนกว่าจะยืนยันในหน้าต่างถัดไป</p>`;
            if(step===0) {
                body='<div class="q-profile-grid">'+body.replace(/(<label[^>]*>[\s\S]*?<\/label><small class="q-error"[^>]*><\/small>)/g,'<div class="q-field">$1</div>')+'</div>';
            }
            const previousStepper = document.getElementById('energy-stepper');
            const missingProcesses = (step===1 || step===2) && !draft.config[step===1?'before':'after'].some(s=>s.active);
            app.innerHTML=`${window.EnergyStepper.markup(steps, step)}${draft.config?.isDemo ? '<p class="prototype">กำลังทดลองด้วยกระบวนการตัวอย่าง ข้อมูลจำลองนี้ไม่ใช่ข้อมูลจริงของคณะ</p>' : ''}<section class="q-card"><h2 tabindex="-1" id="step-heading"><svg class="ev-step-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v17H5zM9 4V2h6v2M8 10h8M8 14h8M8 18h5"/></svg>ขั้นที่ ${step+1}: ${steps[step]}</h2><form id="wizard-form" novalidate>${body}<p id="q-message" role="status"></p><div class="q-form-actions"><button type="button" id="q-back" ${step===0?'disabled':''}>ย้อนกลับ</button><button type="button" id="q-save">บันทึกแบบร่าง</button><button class="primary" type="submit" ${missingProcesses?'disabled':''}>${step===4?'ตรวจสอบและยืนยัน':missingProcesses?'ยังไม่มีขั้นตอนให้ประเมิน':'ถัดไป'}</button></div></form></section><dialog id="confirm-dialog" aria-labelledby="confirm-title"><h2 id="confirm-title">กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนยืนยัน</h2><p>ข้อมูลทดลองจะเก็บเฉพาะเบราว์เซอร์นี้</p><button id="q-cancel">กลับไปตรวจสอบ</button><button class="primary" id="q-confirm">ยืนยันการส่งข้อมูล</button></dialog>`;
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
                const ok=await safe(async()=>{const record={...draft,categoryId:systems.find(s=>s.id===draft.systemId)?.categoryId||'all',submittedAt:new Date().toISOString(),kind:'prototype-user-entry'};await Q.submitToBackend(record);Q.submit(record);submitted=true;return true;});
                if(ok) app.innerHTML=`<section class="q-card"><h2>บันทึกผลประเมินลงฐานข้อมูลแล้ว</h2><p>เปิด Dashboard เพื่อดูผลที่บันทึก</p><a class="q-button" href="../../Satisfaction_Survey/admin/dashboard.html?dataset=${draft.config.isDemo?'demo':'real'}#quantitative-results">ดูผลที่ส่งใน Dashboard</a><a class="q-button" href="evaluation.html">เริ่มแบบประเมินใหม่</a><a class="q-button" href="../../Satisfaction_Survey/user/index.html">ประเมินความพึงพอใจ</a></section>`;
                else {sending=false;document.getElementById('q-confirm').disabled=false;document.getElementById('confirm-dialog').close();}
            };
            if(step===1||step===2) app.querySelectorAll('input[type=number]').forEach(input=>input.addEventListener('input',()=>{capture();const phase=step===1?'before':'after';const list=draft.config[phase].filter(s=>s.active&&s.timed);document.getElementById('duration-total').textContent='เวลารวม: '+(list.length&&list.every(s=>Q.finite(draft.durations[phase][s.id]))?fmt(list.reduce((sum,s)=>sum+draft.durations[phase][s.id],0))+' นาที':'ยังมีข้อมูลไม่ครบ');}));
            if(step===1||step===2) draft.config[step===1?'before':'after'].filter(s=>s.active&&s.timed).forEach(s=>{const select=document.getElementById(`duration-status-${s.id}`);const toggle=()=>{document.getElementById(`duration-${s.id}`).disabled=select.value!=='known';capture();const phase=step===1?'before':'after',timed=draft.config[phase].filter(item=>item.active&&item.timed);document.getElementById('duration-total').textContent='เวลารวม: '+(timed.length&&timed.every(item=>Q.finite(draft.durations[phase][item.id]))?fmt(timed.reduce((sum,item)=>sum+draft.durations[phase][item.id],0))+' นาที':'ยังมีข้อมูลไม่ครบ');};select.onchange=toggle;document.getElementById(`duration-${s.id}`).disabled=select.value!=='known';});
            if(step===3) draft.config.metrics.filter(m=>m.active&&m.source==='manual').forEach(m=>{const select=document.getElementById(`status-${m.id}`);const toggle=()=>{for(const phase of ['before','after'])document.getElementById(`${phase}-${m.id}`).disabled=select.value!=='known';};select.onchange=toggle;toggle();});
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
            editor.innerHTML=`<p>เวอร์ชันที่บันทึก: ${config.version} · แบบร่างที่เริ่มแล้วและผลเก่าจะเก็บโครงสร้างเดิม</p><div class="q-admin-columns">${['before','after'].map(phase=>`<section class="q-card"><h2>กระบวนการ${phase==='before'?'ก่อน':'หลัง'}ใช้ระบบ</h2><div>${config[phase].map((step,index)=>processCard(phase,step,index)).join('')}</div><button type="button" class="primary q-add-step" data-add-phase="${phase}">+ เพิ่มขั้นตอน</button></section>`).join('')}</div><section class="q-card q-kpi">
                <header><div><h2>จัดการตัวชี้วัด (KPI)</h2><p>กำหนดตัวชี้วัดตามระบบ IT ที่เลือก</p></div>
                    <button id="add-metric" class="primary">+ เพิ่มตัวชี้วัดใหม่</button></header>
                <div class="q-kpi-scroll" tabindex="0" role="region" aria-label="ตารางตัวชี้วัด">
                    <table><thead><tr><th>ชื่อตัวชี้วัด</th><th>วิธีคำนวณ</th><th>หน่วย / ฐานการวัด</th><th>ทิศทางเป้าหมาย</th><th>เปิดใช้งาน</th><th>จัดการ</th></tr></thead>
                    <tbody>${config.metrics.map((m,i)=>`<tr>
                        <td><strong data-kpi-name="${i}">${user(m.name || 'ยังไม่ระบุชื่อ')}</strong><small>${user(m.description)}</small></td>
                        <td>${sources.find(([value])=>value===m.source)?.[1] || 'กรอกก่อนและหลัง'}</td>
                        <td><span>${user(m.unit)}</span><small>${user(m.basis)}</small></td>
                        <td><span class="q-kpi-direction" data-direction="${esc(m.direction)}">${({decrease:'↓ ลดลงยิ่งดี',increase:'↑ เพิ่มขึ้นยิ่งดี',target:'◎ เทียบเป้าหมาย'})[m.direction] || 'ยังไม่กำหนด'}</span></td>
                        <td><input type="checkbox" data-kpi-active="${i}" aria-label="เปิดใช้งานตัวชี้วัดรายการที่ ${i+1}" ${m.active?'checked':''}></td>
                        <td><button type="button" data-kpi-edit="${i}" aria-expanded="false" aria-controls="q-kpi-edit-${i}">แก้ไข</button></td>
                    </tr><tr id="q-kpi-edit-${i}" hidden><td colspan="6"><fieldset class="q-kpi-fields" data-metric="${i}"><legend>${esc(m.id)}</legend><div class="q-grid">${field(`m-${i}-name`,'ชื่อตัวชี้วัด',m.name)}${field(`m-${i}-description`,'คำอธิบาย',m.description)}${field(`m-${i}-unit`,'หน่วย',m.unit)}${field(`m-${i}-basis`,'ฐานการวัดเดียวกันก่อนและหลัง',m.basis)}</div><label>ทิศทาง<select id="m-${i}-direction" data-prop="direction" aria-describedby="m-${i}-direction-error">${[['decrease','ลดลงยิ่งดี'],['increase','เพิ่มขึ้นยิ่งดี'],['target','เทียบเป้าหมาย (ใกล้เป้าหมายยิ่งดี)']].map(([v,l])=>`<option value="${v}" ${m.direction===v?'selected':''}>${l}</option>`).join('')}</select></label><small class="q-error" id="m-${i}-direction-error"></small>${field(`m-${i}-target`,'ค่าเป้าหมาย (จำเป็นเมื่อเทียบเป้าหมาย)',m.target,'number')}<label>ประเภทตัวชี้วัด<select data-prop="source">${sources.map(([value,label])=>`<option value="${value}" ${m.source===value?'selected':''}>${label}</option>`).join('')}</select></label><label><input data-prop="active" type="checkbox" ${m.active?'checked':''}> เปิดใช้งานกับระบบนี้</label><label><input data-prop="required" type="checkbox" ${m.required?'checked':''}> จำเป็นต้องระบุสถานะข้อมูล</label><button type="button" data-delete-metric>ลบตัวชี้วัด</button></fieldset></td></tr>`).join('') || '<tr><td colspan="6">ยังไม่มีตัวชี้วัด</td></tr>'}</tbody></table>
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
                editor.querySelectorAll('[data-phase]').forEach(row=>{const {phase,index}=row.dataset,s=config[phase][index];s.name=document.getElementById(`${phase}-${index}-name`).value.trim();s.description=document.getElementById(`${phase}-${index}-description`).value.trim();['active','timed'].forEach(k=>s[k]=row.querySelector(`[data-prop=${k}]`).checked);});
                editor.querySelectorAll('[data-metric]').forEach(row=>{const i=row.dataset.metric,m=config.metrics[i];for(const prop of ['name','description','unit','basis'])m[prop]=document.getElementById(`m-${i}-${prop}`).value.trim();m.target=num(document.getElementById(`m-${i}-target`).value);m.direction=row.querySelector('[data-prop=direction]').value;m.source=row.querySelector('[data-prop=source]').value;for(const k of ['active','required'])m[k]=row.querySelector(`[data-prop=${k}]`).checked;});
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
            editor.querySelectorAll('[data-delete-metric]').forEach(button=>{
                button.onclick=()=>confirmChange('ลบตัวชี้วัดนี้หรือไม่? การเปลี่ยนแปลงจะมีผลเมื่อบันทึกการตั้งค่า',()=>{
                    capture();
                    config.metrics.splice(Number(button.closest('[data-metric]').dataset.metric),1);
                    dirty=true;
                    render();
                    document.getElementById('add-metric').focus();
                });
            });
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
            editor.querySelectorAll('[data-metric]').forEach(fields=>{
                fields.addEventListener('input',()=>{
                    const index=fields.dataset.metric;
                    const cells=fields.closest('tr').previousElementSibling.cells;
                    cells[0].querySelector('strong').textContent=document.getElementById(`m-${index}-name`).value.trim() || 'ยังไม่ระบุชื่อ';
                    cells[0].querySelector('small').textContent=document.getElementById(`m-${index}-description`).value;
                    cells[1].textContent=fields.querySelector('[data-prop="source"]').selectedOptions[0].textContent;
                    cells[2].firstElementChild.textContent=document.getElementById(`m-${index}-unit`).value;
                    cells[2].querySelector('small').textContent=document.getElementById(`m-${index}-basis`).value;
                    const direction=fields.querySelector('[data-prop="direction"]');
                    cells[3].firstElementChild.dataset.direction=direction.value;
                    cells[3].firstElementChild.textContent=direction.selectedOptions[0].textContent;
                });
            });
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
                dirty=true;
                const index=config.metrics.push({id:uid(),name:'',description:'',unit:'',basis:'ต่อคำขอ',direction:'decrease',source:'manual',active:true,required:false})-1;
                render();
                showMetric(index,true);
                document.getElementById(`m-${index}-name`).focus();
            };
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
                config.metrics.forEach((m,i)=>{for(const prop of ['name','unit','basis'])if(!m[prop]){error(`m-${i}-${prop}`,'กรุณากรอกข้อมูล');valid=false;}if(!['increase','decrease','target'].includes(m.direction)){error(`m-${i}-direction`,'กรุณาเลือกทิศทางเป้าหมาย');valid=false;}if(m.direction==='target'&&!Q.finite(m.target)){error(`m-${i}-target`,'กรุณาระบุเป้าหมายตั้งแต่ 0 ขึ้นไป');valid=false;}if(m.source==='time'&&m.unit!=='นาที'){error(`m-${i}-unit`,'เวลาจากขั้นตอนใช้หน่วยนาที');valid=false;}if(m.source==='steps'&&m.unit!=='ขั้นตอน'){error(`m-${i}-unit`,'จำนวนขั้นตอนใช้หน่วยขั้นตอน');valid=false;}});
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
            document.getElementById('results').innerHTML=`<p>ระบบที่ได้รับการประเมิน ${new Set(list.map(r=>r.systemId)).size} ระบบ · ผลทดลอง ${list.length} รายการ</p><p>ค่าเฉลี่ยแยกตามระบบ เวอร์ชัน ตัวชี้วัด หน่วย และฐานการวัด ไม่รวมต่างหน่วยเป็นคะแนนเดียว</p>${[...groups.values()].map(g=>{const b=g.before/g.count,a=g.after/g.count,max=Math.max(b,a,1);return `<section class="q-card"><h3>${esc(g.system)} · ${user(g.m.name)}</h3><p>เวอร์ชัน ${g.version} · ${user(g.m.unit)} / ${user(g.m.basis)} · ${g.count} รายการ · ค่าเฉลี่ยลดลง ${fmt(b-a)}</p><div class="q-bars">ก่อน ${fmt(b)} <span class="q-bar before" style="width:${b/max*60}%"></span></div><div class="q-bars">หลัง ${fmt(a)} <span class="q-bar" style="width:${a/max*60}%"></span></div></section>`;}).join('')}${list.length?list.map(r=>`<details class="q-card"><summary>${esc(r.systemId)} · ${esc(r.submittedAt.slice(0,10))} · เวอร์ชัน ${r.config.version}</summary>${resultTable(r)}</details>`).join(''):'<section class="q-card">ยังไม่มีผลประเมินตามเงื่อนไข</section>'}`;
        }
        app.querySelectorAll('input,select').forEach(el=>el.onchange=render);render();
    }
    safe(()=>{
        systems=Q.systems();
        if(page==='evaluation')wizard();else if(page==='admin')admin();else dashboard();
    });
})();
