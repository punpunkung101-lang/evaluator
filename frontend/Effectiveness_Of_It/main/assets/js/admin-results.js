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
    if(typeof module!=='undefined')module.exports={summarize,initialDataSet,presentation};
    if(typeof document==='undefined')return;
    const section=document.getElementById('quantitative-results');
    if(!section)return;
    const Q=root.Quantitative;
    const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt=v=>v===null?'—':Number(v).toLocaleString('th-TH',{maximumFractionDigits:2});
    const systems=()=>Q.systems();
    const systemName=id=>systems().find(s=>s.id===id)?.name||id;
    function result(m,v){const r=Q.calculate(m,v);return r.available?`${esc(r.outcome)} · ${r.percent===null?'คำนวณเปอร์เซ็นต์ไม่ได้ (ค่าเดิมเป็น 0)':fmt(r.percent)+'%'}${m.direction==='target'?` · เป้าหมาย ${fmt(m.target)} (${r.targetMet?'ถึงเป้าหมาย':'ยังไม่ถึงเป้าหมาย'})`:''}`:esc(r.reason);}
    function icon(kind) {
        const paths={time:'M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',steps:'M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1',paper:'M14 3H6v18h12V7zM14 3v5h4M9 12h6M9 16h6',errors:'M12 8v5M12 17h.01M12 3 2 21h20z',target:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0M12 10v4M10 12h4'};
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[kind]||paths.target}"/></svg>`;
    }
    function metricCard(g) {
        const m=g.metric,input={status:g.count?'known':'unknown',before:g.before,after:g.after},p=presentation(m,input,Q.calculate);
        const max=Math.max(g.before||0,g.after||0,1);
        const percent=p.percent===null?'ไม่สามารถคำนวณเปอร์เซ็นต์ได้':`${p.percent>0?'+':''}${p.percent.toFixed(2)}%`;
        return `<article class="qd-chart qd-metric-card"><div class="qd-metric-main"><div class="qd-metric-title"><span class="qd-metric-icon">${icon(m.id==='time'||m.id==='steps'||m.id==='paper'||m.id==='errors'?m.id:m.direction==='target'?'target':m.source)}</span><h3>${esc(m.name)}</h3></div><p class="qd-system-name">${esc(systemName(g.systemId))}</p><p>${esc(m.unit)} / ${esc(m.basis)}</p><p class="qd-meta">เวอร์ชัน ${esc(g.version)} · ข้อมูลครบ ${g.count} รายการ</p><div class="qd-values"><div><span>ก่อนใช้ระบบ</span><strong>${fmt(g.before)}</strong></div><div><span>หลังใช้ระบบ</span><strong>${fmt(g.after)}</strong></div></div><div class="qd-bar-row"><span>ก่อนใช้</span><div><i class="qd-before" style="width:${(g.before||0)/max*100}%"></i></div></div><div class="qd-bar-row"><span>หลังใช้</span><div><i style="width:${(g.after||0)/max*100}%"></i></div></div></div><div class="qd-delta qd-delta--${p.tone}"><span class="qd-delta-arrow" aria-hidden="true">${p.arrow}</span><p class="qd-delta-label">${p.label}</p><strong class="qd-delta-number">${p.amount===null?'—':fmt(p.amount)}</strong><span class="qd-delta-unit">${esc(m.unit)}</span><span class="qd-delta-percent">${p.amount===null?'ไม่มีข้อมูลที่คำนวณได้':percent}</span><span class="qd-delta-outcome">${esc(p.outcome)}</span>${m.direction==='target'?`<span class="qd-delta-target">เป้าหมาย ${fmt(m.target)} ${esc(m.unit)}</span>`:''}</div></article>`;
    }
    section.innerHTML=`<div class="qd-heading"><div class="qd-brand"><img class="qd-logo" src="../../Publice/Nu_bage.png" alt="ตรามหาวิทยาลัยนเรศวร" width="60" height="60"><div><p class="qd-eyebrow">EFFICIENCY & EFFECTIVENESS</p><h2>ผลประเมินประสิทธิภาพและประสิทธิผล</h2><p>เปรียบเทียบข้อมูลการทำงานก่อนและหลังใช้ระบบสารสนเทศ</p></div></div><a class="btn btn-primary btn-sm" href="../../Effectiveness_Of_It/main/admin.html">จัดการกระบวนการและตัวชี้วัด</a></div><p class="qd-notice">Frontend Prototype · อ่านข้อมูลที่ยืนยันส่งจาก localStorage ในเบราว์เซอร์และที่อยู่เว็บเดียวกัน ไม่ใช่ข้อมูลจากฐานข้อมูลส่วนกลาง</p><div class="qd-filters"><label>ระบบ IT<select id="qd-system"><option value="">ทุกระบบ</option></select></label><label>ชุดข้อมูล<select id="qd-demo"><option value="real">ข้อมูลที่ผู้ใช้ทดลองกรอก</option><option value="demo">ข้อมูลจากกระบวนการตัวอย่าง (จำลอง)</option></select></label><label>ตั้งแต่วันที่<input type="date" id="qd-start"></label><label>ถึงวันที่<input type="date" id="qd-end"></label><button type="button" class="btn btn-secondary btn-sm" id="qd-refresh">แสดงผล / โหลดข้อมูลใหม่</button><button type="button" class="btn btn-secondary btn-sm" id="qd-reset">รีเซ็ต</button><button type="button" class="btn btn-secondary btn-sm" id="qd-export">ดาวน์โหลด JSON ส่วนนี้</button></div><p id="qd-message" role="status"></p><div id="qd-content"></div>`;
    const el=id=>document.getElementById(id);
    let filtered=[],initialized=false;
    function render(){
        try {
            const records=Q.records();if(!Array.isArray(records))throw new Error('รูปแบบข้อมูลไม่ใช่รายการผลประเมิน');
            if(!initialized){const requested=new URLSearchParams(root.location.search).get('dataset');el('qd-demo').value=['real','demo'].includes(requested)?requested:initialDataSet(records);initialized=true;}
            const selected=el('qd-system').value;
            const ids=[...new Set([...systems().map(s=>s.id),...records.map(r=>r?.systemId).filter(Boolean)])];
            el('qd-system').innerHTML='<option value="">ทุกระบบ</option>'+ids.map(id=>`<option value="${esc(id)}">${esc(systemName(id))} (${esc(id)})</option>`).join('');el('qd-system').value=selected;
            const now=new Date(),period=el('periodFilter')?.value,year=String(now.getFullYear()),month=year+'-'+String(now.getMonth()+1).padStart(2,'0');
            const filters={system:selected,demo:el('qd-demo').value,start:el('qd-start').value,end:el('qd-end').value,periodPrefix:period==='month'?month:period==='year'?year:''};
            if(filters.start&&filters.end&&filters.start>filters.end){el('qd-message').textContent='วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด';el('qd-content').innerHTML='';filtered=[];return;}
            const summary=summarize(records,filters);filtered=summary.records;
            const otherCount=records.filter(r=>r?.config&&(filters.demo==='demo'?!r.config.isDemo:!!r.config.isDemo)).length;
            el('qd-message').textContent=(filters.demo==='demo'?'กำลังแสดงผลจากกระบวนการตัวอย่าง (ข้อมูลจำลอง) · ':'')+(summary.unavailable?`มีตัวชี้วัด ${summary.unavailable} รายการที่ข้อมูลไม่ครบ / ไม่เกี่ยวข้อง จึงไม่นำมาคำนวณค่าเฉลี่ย · `:'')+(otherCount?`มีผลอีก ${otherCount} รายการในชุดข้อมูลอีกประเภท เปลี่ยนตัวกรองชุดข้อมูลเพื่อดู · `:'')+(!records.length?`ไม่พบผลประเมินใน ${root.location.origin} กรุณาเปิด Dashboard ด้วยเบราว์เซอร์ โฮสต์ และพอร์ตเดียวกับหน้าที่ส่งผลประเมิน`: '');
            const cards=[['ระบบที่ได้รับการประเมิน',summary.systems,'ระบบ'],['ผลประเมินที่ยืนยันแล้ว',filtered.length,'รายการ'],['กลุ่มข้อมูลที่เปรียบเทียบได้',summary.groups.length,'กลุ่ม'],['ผลประเมินที่ต่ำกว่าเป้าหมาย',summary.belowTarget,'รายการ']];
            el('qd-content').innerHTML=`<div class="qd-stats">${cards.map(([label,value,unit],index)=>`<div><span class="qd-kpi-icon" aria-hidden="true">${icon(['steps','paper','time','target'][index])}</span><h3>${label}</h3><strong>${value}</strong><span>${unit}</span></div>`).join('')}</div><div class="qd-notice qd-explainer"><span class="qd-info-icon" aria-hidden="true">i</span><div><strong>ประสิทธิภาพ:</strong> พิจารณาทรัพยากรที่ใช้ เช่น เวลา ขั้นตอน กระดาษ และข้อผิดพลาด <br><strong>ประสิทธิผล:</strong> พิจารณาตามตัวชี้วัดที่มีเป้าหมาย ${summary.targets?'':'— ยังไม่ได้กำหนดเกณฑ์ประสิทธิผลสำหรับข้อมูลที่เลือก'}<br>ไม่รวมต่างหน่วยเป็นคะแนนเดียว ค่าเฉลี่ยแยกตามระบบ เวอร์ชัน ตัวชี้วัด หน่วย และฐานการวัด<br>รายการที่มีเป้าหมาย ${summary.targets} รายการ · KPI ต่ำกว่าเป้าหมายนับรายการที่มีค่าหลังใช้ต่ำกว่าเป้าหมายอย่างน้อย 1 ตัวชี้วัด</div></div>${!filtered.length?'<div class="qd-empty"><h3>ยังไม่มีผลประเมินในชุดข้อมูลที่เลือก</h3><p>ตั้งค่ากระบวนการ กรอกแบบประเมินให้ครบ และยืนยันส่งก่อน ผลจึงจะแสดงที่นี่</p><a class="btn btn-secondary btn-sm" href="../../Effectiveness_Of_It/main/evaluation.html">เปิดแบบประเมิน</a></div>':''}<div class="qd-charts">${summary.displayGroups.map(metricCard).join('')}</div>${filtered.length?'<h3>รายละเอียดผลประเมินรายระบบ</h3>':''}${filtered.map(r=>`<details class="qd-record"><summary><span class="qd-chevron" aria-hidden="true">›</span><span>${esc(systemName(r.systemId))} · ${esc(r.submittedAt.slice(0,10))} · เวอร์ชัน ${esc(r.config.version)} ${r.config.isDemo?'(ข้อมูลจำลอง)':''}</span><span class="qd-open-state" aria-hidden="true"></span></summary><div class="qd-table"><table><thead><tr><th>ตัวชี้วัด / ฐานการวัด</th><th>ก่อน</th><th>หลัง</th><th>ผลการเปรียบเทียบ</th></tr></thead><tbody>${r.config.metrics.filter(m=>m.active).map(m=>{const v=r.values[m.id];return `<tr><th>${esc(m.name)}<br><small>${esc(m.unit)} / ${esc(m.basis)}</small></th><td>${v?.status==='known'&&finite(v.before)?fmt(v.before):'—'}</td><td>${v?.status==='known'&&finite(v.after)?fmt(v.after):'—'}</td><td>${result(m,v)}</td></tr>`;}).join('')}</tbody></table></div></details>`).join('')}`;
        }catch(error){filtered=[];el('qd-message').textContent='อ่านผลประเมินเชิงปริมาณไม่ได้: '+error.message;el('qd-content').innerHTML='';}
    }
    section.querySelectorAll('input,select').forEach(input=>input.addEventListener('change',render));
    el('periodFilter')?.addEventListener('change',render);
    el('qd-refresh').addEventListener('click',render);
    el('qd-reset').addEventListener('click',()=>{el('qd-system').value='';el('qd-start').value='';el('qd-end').value='';el('qd-demo').value=initialDataSet(Q.records());if(el('periodFilter')){el('periodFilter').value='all';el('periodFilter').dispatchEvent(new Event('change'));}render();});
    root.addEventListener('storage',event=>{if(event.key===Q.keys.records||event.key===null)render();});
    el('qd-export').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(filtered,null,2)],{type:'application/json;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='quantitative-results.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    render();
})(typeof window!=='undefined'?window:globalThis);
