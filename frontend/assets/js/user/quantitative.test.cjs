const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
test('effectiveness examples export bilingual metrics with total weight 100 and unique ids',()=>{
    const examples=require('./effectiveness-examples.js');
    assert.equal(examples.metrics.reduce((sum,metric)=>sum+metric.weight,0),100);
    assert.equal(new Set(examples.metrics.map(metric=>metric.id)).size,examples.metrics.length);
    for(const metric of examples.metrics) for(const field of ['dimension','name','unit','formula','source']) {
        assert.ok(metric[field].th,`${metric.id}.${field}.th`);
        assert.ok(metric[field].en,`${metric.id}.${field}.en`);
    }
    assert.doesNotMatch(JSON.stringify(examples.metrics),/แจ้งซ่อม/);
    for(const group of Object.values(examples.groups)) for(const language of ['th','en']) for(const phase of ['before','after']) assert.ok(group[language][phase].length);
});
test('energy stepper renders three wizard stages with exactly one current step',()=>{
    const context={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/assets/js/user/energy-stepper.js'),'utf8'),context);
    const labels=['เลือกระบบ','กระบวนการและตัวชี้วัด','ตรวจสอบและส่ง'];
    for(const step of [0,1,2,1,0]) {
        const html=context.window.EnergyStepper.markup(labels,step);
        assert.equal((html.match(/aria-current="step"/g)||[]).length,1);
        assert.equal((html.match(/class="energy-circle"/g)||[]).length,3);
        assert.equal((html.match(/energy-step is-complete/g)||[]).length,step);
        assert.ok(html.includes(`--energy-progress:${step/2}`));
        for(const label of labels) assert.ok(html.includes(label));
    }
});
test('energy stepper sizes its grid from three or five labels without a fixed five-column CSS rule',()=>{
    const context={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/assets/js/user/energy-stepper.js'),'utf8'),context);
    for(const count of [3,5]) {
        const labels=Array.from({length:count},(_,index)=>`Step ${index+1}`);
        const html=context.window.EnergyStepper.markup(labels,0);
        assert.ok(html.includes(`style="--step-count:${count}"`));
        assert.equal((html.match(/class="energy-step /g)||[]).length,count);
    }
    const css=fs.readFileSync(path.join(root,'frontend/assets/css/pages/effectiveness/energy-stepper.css'),'utf8');
    assert.match(css,/grid-template-columns:\s*repeat\(var\(--step-count\),/);
    assert.doesNotMatch(css,/grid-template-columns:\s*repeat\(\s*5\b/);
});
function setup() {
    const store = new Map();
    const context = { localStorage: { getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k) } };
    vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/assets/js/user/quantitative-data.js'),'utf8'),context);
    return { Q: context.Quantitative, store, context };
}
test('decreasing metrics report reduction, deterioration, unchanged and a zero baseline', () => {
    const {Q} = setup(), m=Q.defaults().metrics[0];
    const result=Q.calculate(m,{status:'known',before:240,after:30});
    assert.equal(result.delta,-210); assert.equal(result.percent,-87.5); assert.equal(result.outcome,'ดีขึ้น');
    assert.equal(Q.calculate(m,{status:'known',before:30,after:240}).outcome,'แย่ลง');
    assert.equal(Q.calculate(m,{status:'known',before:0,after:10}).percent,null);
    assert.equal(Q.calculate(m,{status:'known',before:0,after:0}).outcome,'คงเดิม');
});
test('missing, not applicable, negative and invalid data never become zeros', () => {
    const {Q}=setup(), m=Q.defaults().metrics[0];
    for(const input of [null,{status:'unknown'},{status:'na'},{status:'known',before:null,after:0},{status:'known',before:-1,after:0},{status:'known',before:NaN,after:0}]) assert.equal(Q.calculate(m,input).available,false);
});
test('increase and exact-target calculations have distinct outcomes',()=>{
    const {Q}=setup();
    assert.equal(Q.calculate({direction:'increase'},{status:'known',before:10,after:20}).outcome,'ดีขึ้น');
    assert.equal(Q.calculate({direction:'target',target:100},{status:'known',before:50,after:100}).targetMet,true);
    assert.equal(Q.calculate({direction:'target',target:100},{status:'known',before:90,after:120}).outcome,'แย่ลง');
    assert.equal(Q.calculate({direction:'target'},{status:'known',before:10,after:20}).available,false);
});
test('admin configuration updates new forms while snapshots and other systems remain unchanged',()=>{
    const {Q}=setup();
    const config=Q.config('SYS002');
    config.before.push({id:'before1',name:'Paper request',active:true,timed:true});
    const saved=Q.saveConfig('SYS002',config);
    Q.submit({id:'record1',config:saved,values:{}});
    config.before[0].name='Renamed';config.before.push({id:'before2',name:'Approval',active:true,timed:false});
    config.metrics[2].active=false;
    Q.saveConfig('SYS002',config);
    assert.equal(Q.config('SYS002').before.length,2);
    assert.equal(Q.config('SYS002').metrics[2].active,false);
    assert.equal(Q.records()[0].config.before[0].name,'Paper request');
    assert.equal(Q.records()[0].config.before.length,1);
    assert.equal(Q.config('SYS002').version,2);
    assert.equal(Q.config('SYS003').before.length,0);
});
test('draft resumes separately from submitted records and confirmation is idempotent',()=>{
    const {Q,store}=setup(), draft={id:'one',step:2,values:{paper:{status:'unknown'}}}, userId='00000001';
    Q.saveDraft(draft,userId); assert.equal(Q.draft(userId).step,2); assert.equal(Q.records().length,0);
    Q.submit(draft,userId);Q.submit(draft,userId);
    assert.equal(Q.records().length,1);assert.equal(Q.draft(userId),null);
    assert.ok(!store.has(Q.keys.draft));
    assert.ok(!store.has('it_evaluations_store'));
});
test('legacy draft stages map to the three-stage wizard and malformed stages reset safely',()=>{
    const {Q}=setup();
    for(const [oldStep,newStep] of [[0,0],[1,1],[2,1],[3,1],[4,2],[-1,0],[7,0],['bad',0],[null,0]]) assert.equal(Q.migrateDraft({step:oldStep}).step,newStep);
    for(const [step,expected] of [[0,0],[1,1],[2,2],[-1,0],[7,0],['bad',0]]) assert.equal(Q.migrateDraft({wizardVersion:3,step}).step,expected);
    const migrated=Q.migrateDraft({step:3,config:{before:[{id:'b'}]},durations:{before:{b:4}},durationStatuses:{before:{b:'known'}},values:{paper:{status:'unknown'}}});
    assert.equal(migrated.step,1);assert.equal(JSON.stringify(migrated.config),JSON.stringify({before:[{id:'b'}]}));assert.equal(JSON.stringify(migrated.durations),JSON.stringify({before:{b:4}}));assert.equal(JSON.stringify(migrated.durationStatuses),JSON.stringify({before:{b:'known'}}));assert.equal(JSON.stringify(migrated.values),JSON.stringify({paper:{status:'unknown'}}));
    assert.equal(Q.migrateDraft(null),null);
});
test('custom process and metric fields reject blank, whitespace and overlong values',()=>{
    const {Q}=setup();
    for(const name of ['', '   ', 'x'.repeat(121)]) assert.equal(Q.validateCustomProcess({name,description:''}).name,false);
    assert.equal(Q.validateCustomProcess({name:'Review request',description:'x'.repeat(501)}).description,false);
    assert.equal(Q.validateCustomProcess({name:'Review request',description:'Optional details'}).name,true);
    for(const name of ['', '  ', 'x'.repeat(121)]) assert.equal(Q.validateCustomMetric({name,unit:'cases',direction:'decrease'}).name,false);
    assert.equal(Q.validateCustomMetric({name:'Queue time',unit:'',direction:'decrease'}).unit,false);
    assert.equal(Q.validateCustomMetric({name:'Queue time',unit:'hours',direction:''}).direction,false);
    assert.equal(Q.validateCustomMetric({name:'Queue time',unit:'h'.repeat(33),direction:'decrease'}).unit,false);
    assert.equal(JSON.stringify(Q.validateCustomMetric({name:'Queue time',unit:'hours',direction:'decrease'})),JSON.stringify({name:true,unit:true,direction:true,description:true}));
});
test('drafts are isolated by authenticated user and legacy unscoped drafts are ignored',()=>{
    const {Q,store}=setup();
    const userA='00000001',userB='00000002';
    store.set(Q.keys.draft,JSON.stringify({id:'legacy',step:3,systemId:'SYS013'}));
    Q.saveDraft({id:'a-draft',step:1,systemId:'SYS013'},userA);
    assert.equal(Q.draft(userA).id,'a-draft');
    assert.equal(Q.draft(userB),null);
    assert.equal(Q.draft(),null);
    Q.clearDraft(userB);
    assert.equal(Q.draft(userA).id,'a-draft');
    Q.clearDraft(userA);
    assert.equal(Q.draft(userA),null);
});
test('?system overrides a different draft, while opening without it asks before resuming',()=>{
    const source=fs.readFileSync(path.join(root,'frontend/assets/js/user/quantitative.js'),'utf8');
    assert.match(source,/if \(requested && draft\?\.systemId !== requested\) \{\s*Q\.clearDraft\(userId\);\s*draft = null;/);
    assert.match(source,/draft \|\|= \{ id:uid\(\), userId, step:0/);
    assert.match(source,/draft\.systemId = requested;\s*draft\.config = Q\.config\(requested\)/);
    assert.match(source,/!requested && draft/);
    assert.match(source,/window\.confirm\(`มีแบบร่างที่ค้างอยู่/);
    assert.match(source,/if \(!resume\) \{\s*Q\.clearDraft\(userId\)/);
});
test('storage errors propagate rather than reporting success',()=>{
    const {Q,store}=setup();store.set(Q.keys.records,'invalid JSON');
    assert.throws(()=>Q.submit({id:'bad'}));
});
async function wizardHarness(mode) {
    const {Q,context}=setup();
    const config=Q.defaults();
    config.before=[{id:'b',name:'Before',description:'Existing config process',active:true,timed:true}];
    config.after=[{id:'a',name:'After',description:'Existing config process',active:true,timed:true}];
    if(mode==='configured') Q.saveConfig('SYS002',config);
    vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/assets/js/user/effectiveness-examples.js'),'utf8'),context);
    context.window={Quantitative:Q,EffectivenessExamples:context.EffectivenessExamples,EvaluationLocale:{translate:value=>value,getLanguage:()=> 'th',setLanguage(){}},confirm:()=>true,EvaluatorAuth:{current:()=>({id:'00000001',name:'Test User',role:'staff'}),verify:async()=>({id:'00000001',name:'Test User',displayName:'Test User',role:'staff'})}};
    context.EvaluationLocale=context.window.EvaluationLocale;
    vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/assets/js/user/energy-stepper.js'),'utf8'),context);
    Q.systems=()=>[{id:'SYS002',name:'Leave'}];
    context.crypto={randomUUID:()=> 'wizard-test'};
    context.URLSearchParams=URLSearchParams;context.location={search:'',href:'http://127.0.0.1:5500/frontend/user/effectiveness/evaluation.html',pathname:'/frontend/user/effectiveness/evaluation.html',hash:'',replace(){}};
    context.sessionStorage={getItem:()=>null};
    const nodes=new Map();
    const decode=s=>String(s??'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
    function node(id,value='',tagName='INPUT',attrs='') {
        const result={id,value,textContent:'',attributes:{},dataset:{},tagName:tagName.toUpperCase(),className:attrs.match(/\bclass="([^"]*)"/)?.[1]||'',disabled:false,listeners:{},focus(){if(context.document)context.document.activeElement=this;},addEventListener(type,fn){this.listeners[type]=fn;},click(){this.listeners.click?.({stopPropagation(){}});this.onclick?.();},setAttribute(k,v){this.attributes[k]=v;},showModal(){this.open=true;},close(){this.open=false;},contains(){return false;}};
        for(const [attr,key] of [['data-example-choice','exampleChoice'],['data-example-id','exampleId']]) { const match=attrs.match(new RegExp(`${attr}="([^"]*)"`)); if(match) result.dataset[key]=decode(match[1]); }
        const ariaInvalid=attrs.match(/aria-invalid="([^"]*)"/);if(ariaInvalid)result.attributes['aria-invalid']=ariaInvalid[1];
        return result;
    }
    const app=node('quant-app','','DIV');
    Object.defineProperty(app,'innerHTML',{set(html){
        this.html=html;nodes.clear();nodes.set('quant-app',this);
        for(const match of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
            const [,tag,attrs,id]=match;const created=node(id,decode(attrs.match(/\bvalue="([^"]*)"/)?.[1]),tag,attrs);nodes.set(id,created);
            if(tag==='select') {
                const content=html.slice(match.index+match[0].length).split('</select>')[0];
                const options=[...content.matchAll(/<option value="([^"]*)"([^>]*)>/g)];
                created.value=decode((options.find(o=>/selected/.test(o[2]))||options[0])?.[1]);
            }
        }
    }});
    app.querySelector=selector=>[...nodes.values()].find(n=>n.attributes['aria-invalid']==='true');
    app.querySelectorAll=selector=>{
        const all=[...nodes.values()];
        if(selector==='input[type=number]')return all.filter(n=>/^(duration-|before-|after-)/.test(n.id)&&!n.id.includes('status')&&!n.id.endsWith('error'));
        if(selector==='[aria-invalid=true]')return all.filter(n=>n.attributes['aria-invalid']==='true');
        if(selector==='.q-error')return all.filter(n=>n.id.endsWith('-error'));
        if(selector==='[data-example-choice]')return all.filter(n=>n.dataset.exampleChoice);
        if(selector==='.q-custom-field')return all.filter(n=>n.className.split(/\s+/).includes('q-custom-field'));
        return [];
    };
    context.document={currentScript:{src:'http://127.0.0.1:5500/frontend/assets/js/user/quantitative.js'},body:{dataset:{quantPage:'evaluation'}},activeElement:null,getElementById:id=>id==='quant-app'?app:nodes.get(id)};
    context.window.EvaluatorRuntimeUrl={fromScript:(path,script)=>new URL(path,script).href};
    const run=()=>vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/assets/js/user/quantitative.js'),'utf8'),context);
    const submit=()=>nodes.get('wizard-form').onsubmit({preventDefault(){}});
    const choose=(choice,id)=>{
        const button=app.querySelectorAll('[data-example-choice]').find(item=>item.dataset.exampleChoice===choice&&(!id||item.dataset.exampleId===id));
        assert.ok(button,`missing selectable example ${choice}${id?`/${id}`:''}`);button.click();
    };
    run();await new Promise(resolve=>setTimeout(resolve,0));
    assert.ok(app.html.includes('Test User'));
    assert.ok(!nodes.has('q-name')&&!nodes.has('q-role')&&!nodes.has('q-department'));
    submit();assert.equal(nodes.get('q-system').attributes['aria-invalid'],'true');
    nodes.get('q-system').value='SYS002';submit();
    if(mode==='examples') {
        const processExamples=context.EffectivenessExamples.processExamples('SYS002','th');
        choose('before',processExamples.before[0].id);choose('after',processExamples.after[0].id);
        assert.equal(Q.records().length,0);
    }
    if(mode==='custom') {
        choose('other-process-before');choose('other-process-after');choose('other-metric');
        submit();
        assert.equal(nodes.get('custom-process-name-before').attributes['aria-invalid'],'true');
        assert.equal(nodes.get('custom-metric-name-custom-metric-wizard-test').attributes['aria-invalid'],'true');
        nodes.get('custom-process-name-before').value='Request intake';
        nodes.get('custom-process-name-after').value='System intake';
        nodes.get('custom-metric-name-custom-metric-wizard-test').value='Staff handling time';
        nodes.get('custom-metric-unit-custom-metric-wizard-test').value='minutes';
        nodes.get('custom-metric-direction-custom-metric-wizard-test').value='decrease';
    }
    const configIds=mode==='configured'?{before:['b'],after:['a']}:mode==='custom'?{before:['custom-process-before'],after:['custom-process-after']}:null;
    const selectedIds=configIds||{
        before:[context.EffectivenessExamples.processExamples('SYS002','th').before[0].id],
        after:[context.EffectivenessExamples.processExamples('SYS002','th').after[0].id]
    };
    const firstBefore=`duration-before-${selectedIds.before[0]}`,firstAfter=`duration-after-${selectedIds.after[0]}`;
    assert.ok(nodes.has(firstBefore));
    if(mode==='configured') { nodes.get(firstBefore).value='-1';submit();assert.equal(nodes.get(firstBefore).attributes['aria-invalid'],'true'); }
    nodes.get(firstBefore).value='240';nodes.get(firstAfter).value='30';
    if(mode==='custom') {
        nodes.get('custom-metric-direction-custom-metric-wizard-test').value='decrease';
        nodes.get('before-custom-metric-wizard-test').value='18';nodes.get('after-custom-metric-wizard-test').value='9';
        nodes.get('status-custom-metric-wizard-test').value='known';
    }
    nodes.get('status-paper').value='unknown';nodes.get('status-errors').value='na';
    if(mode==='custom') {
        nodes.get('q-save').onclick();
        assert.equal(Q.draft('00000001').step,1);
        assert.equal(Q.draft('00000001').config.metrics.find(item=>item.id.startsWith('custom-metric-')).name,'Staff handling time');
        run();await new Promise(resolve=>setTimeout(resolve,0));
        assert.equal(nodes.get('custom-metric-name-custom-metric-wizard-test').value,'Staff handling time');
    }
    submit();assert.equal(Q.draft('00000001').step,2);assert.equal(Q.records().length,0);
    const reviewed=app.html.includes('-87.5%');
    submit();assert.equal(nodes.get('confirm-dialog').open,true);
    nodes.get('q-cancel').onclick();submit();
    let submittedRecord;
    Q.submitToBackend=async record=>{submittedRecord=record;return {success:true};};
    await nodes.get('q-confirm').onclick();
    assert.equal(Q.records().length,1);assert.equal(Q.records()[0].values.time.before,240);assert.equal(Q.draft('00000001'),null);
    assert.ok(!Object.hasOwn(submittedRecord,'wizardVersion'));
    if(mode==='custom') {
        const custom=submittedRecord.config.metrics.find(item=>item.id.startsWith('custom-metric-'));
        assert.ok(custom);assert.ok(!Object.hasOwn(custom,'custom'));
        assert.equal(custom.name,'Staff handling time');
    }
    return {app,nodes,Q,reviewed};
}
test('wizard completes with configured processes and preserves the existing record payload',async()=>{
    const {Q,reviewed}=await wizardHarness('configured');
    assert.ok(reviewed);
    assert.equal(Q.records()[0].config.before[0].id,'b');
});
test('wizard completes with selectable examples when a system has no process configuration',async()=>{
    const {Q,reviewed}=await wizardHarness('examples');
    assert.ok(reviewed);
    assert.match(Q.records()[0].config.before[0].id,/^example-SYS002-before-/);
});
test('wizard validates, drafts, resumes and submits custom processes and indicators',async()=>{
    const {Q}=await wizardHarness('custom');
    const record=Q.records()[0];
    assert.equal(record.config.before[0].name,'Request intake');
    assert.equal(record.config.metrics.find(item=>item.id.startsWith('custom-metric-')).unit,'minutes');
});
test('local HTML scripts and styles resolve to existing files, and user navigation contains no admin links',()=>{
    const files=['frontend/user/index.html','frontend/user/effectiveness/evaluation.html','frontend/admin/manage/processes.html','frontend/admin/dashboard.html',...['index','satisfaction'].map(p=>`frontend/user/satisfaction/${p}.html`)];
    for(const file of files) {
        const absolute=path.join(root,file),html=fs.readFileSync(absolute,'utf8');
        for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
            const url=match[1];if(/^(?:https?:|mailto:|#)/.test(url)||!/[.](?:js|css)$/.test(url))continue;
            assert.ok(fs.existsSync(path.resolve(path.dirname(absolute),url)),`${file}: ${url}`);
        }
        if (file === 'frontend/user/index.html') {
            assert.ok(html.includes('id="app-site-header"'));
            assert.ok(fs.readFileSync(path.join(root, 'frontend/assets/js/layout/site-header.js'), 'utf8').includes('id="primary-nav"'));
        } else if (file === 'frontend/user/effectiveness/evaluation.html') {
            assert.ok(html.includes('assets/js/layout/site-header.js'));
            assert.ok(html.includes('assets/js/user/assessment-form.js'));
            assert.ok(html.includes('assets/js/core/conditional-engine.js'));
        } else if (file === 'frontend/admin/dashboard.html') {
            assert.ok(html.includes('id="quantitative-results"'));
            assert.ok(html.includes('id="app-sidebar"'));
            assert.ok(html.includes('assets/js/admin/admin-results.js'));
        } else {
            assert.ok(html.includes('assets/js/layout/site-header.js'));
        }
    }
});
