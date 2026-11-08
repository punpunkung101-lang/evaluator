const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
test('energy stepper fills and drains all five stages with exactly one current step',()=>{
    const context={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/assets/js/user/energy-stepper.js'),'utf8'),context);
    const labels=['ข้อมูลผู้ประเมิน','กระบวนการก่อนใช้ IT','กระบวนการหลังใช้ IT','ตัวชี้วัด','ตรวจสอบและส่ง'];
    for(const step of [0,1,2,3,4,3,2,1,0]) {
        const html=context.window.EnergyStepper.markup(labels,step);
        assert.equal((html.match(/aria-current="step"/g)||[]).length,1);
        assert.equal((html.match(/class="energy-circle"/g)||[]).length,5);
        assert.equal((html.match(/energy-step is-complete/g)||[]).length,step);
        assert.ok(html.includes(`--energy-progress:${step/4}`));
        for(const label of labels) assert.ok(html.includes(label));
    }
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
for (const mode of ['configured', 'demo', 'refresh']) test(`wizard completes with ${mode} processes, validates and preserves draft values`,async()=>{
    const {Q,context}=setup();
    const config=Q.defaults();
    config.before=[{id:'b',name:'Before',active:true,timed:true}];
    config.after=[{id:'a',name:'After',active:true,timed:true}];
    if (mode === 'configured') Q.saveConfig('SYS002',config);
    context.window={Quantitative:Q,confirm:()=>true,EvaluatorAuth:{current:()=>({id:'00000001',name:'Test User',role:'staff'}),verify:async()=>({id:'00000001',name:'Test User',displayName:'Test User',role:'staff'})}};
    vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/assets/js/user/energy-stepper.js'),'utf8'),context);
    Q.systems=()=>[{id:'SYS002',name:'Leave'}];
    context.crypto={randomUUID:()=> 'wizard-test'};
    context.URLSearchParams=URLSearchParams;context.location={search:'',href:'http://127.0.0.1:5500/frontend/user/effectiveness/evaluation.html',pathname:'/frontend/user/effectiveness/evaluation.html',hash:'',replace(){}};
    context.sessionStorage={getItem:()=>null};
    const nodes=new Map();
    const decode=s=>String(s??'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
    function node(id,value='') { return {id,value,textContent:'',attributes:{},disabled:false,listeners:{},focus(){},addEventListener(type,fn){this.listeners[type]=fn;},click(){this.listeners.click?.();},setAttribute(k,v){this.attributes[k]=v;},showModal(){this.open=true;},close(){this.open=false;}}; }
    const app=node('quant-app');
    Object.defineProperty(app,'innerHTML',{set(html){
        this.html=html;nodes.clear();nodes.set('quant-app',this);
        for(const match of html.matchAll(/<([a-z]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
            const [,tag,attrs,id]=match;nodes.set(id,node(id,decode(attrs.match(/\bvalue="([^"]*)"/)?.[1])));
            if(tag==='select') {
                const content=html.slice(match.index+match[0].length).split('</select>')[0];
                const options=[...content.matchAll(/<option value="([^"]*)"([^>]*)>/g)];
                nodes.get(id).value=decode((options.find(o=>/selected/.test(o[2]))||options[0])?.[1]);
            }
        }
    }});
    app.querySelector=selector=>[...nodes.values()].find(n=>n.attributes['aria-invalid']==='true');
    app.querySelectorAll=selector=>selector==='input[type=number]'?[...nodes.values()].filter(n=>/^(duration-|before-|after-)/.test(n.id)&&!n.id.includes('status')&&!n.id.endsWith('error')):selector==='[aria-invalid=true]'?[...nodes.values()].filter(n=>n.attributes['aria-invalid']==='true'):selector==='.q-error'?[...nodes.values()].filter(n=>n.id.endsWith('-error')):[];
    context.document={currentScript:{src:'http://127.0.0.1:5500/frontend/assets/js/user/quantitative.js'},body:{dataset:{quantPage:'evaluation'}},getElementById:id=>id==='quant-app'?app:nodes.get(id)};
    context.window.EvaluatorRuntimeUrl={fromScript:(path,script)=>new URL(path,script).href};
    const run=()=>vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/assets/js/user/quantitative.js'),'utf8'),context);
    const submit=()=>nodes.get('wizard-form').onsubmit({preventDefault(){}});
    run();await new Promise(resolve=>setTimeout(resolve,0));
    assert.ok(app.html.includes('Test User'));
    assert.ok(!nodes.has('q-name')&&!nodes.has('q-role')&&!nodes.has('q-department'));
    submit();assert.equal(nodes.get('q-system').attributes['aria-invalid'],'true');
    nodes.get('q-system').value='SYS002';
    submit();
    if(mode!=='configured') {
        assert.ok(nodes.has('q-use-demo'));
        assert.equal(Q.records().length,0);
        if(mode==='demo') {nodes.get('q-use-demo').click();assert.ok(app.html.includes('ข้อมูลจำลอง'));assert.equal(Q.config('SYS002').before.length,0);}
        else {Q.saveConfig('SYS002',config);await nodes.get('q-refresh-config').click();}
    }
    const beforeIds=mode==='demo'?Q.demoConfig().before.map(s=>s.id):['b'];
    const afterIds=mode==='demo'?Q.demoConfig().after.map(s=>s.id):['a'];
    const firstBefore=`duration-${beforeIds[0]}`,firstAfter=`duration-${afterIds[0]}`;
    assert.ok(nodes.has(firstBefore));
    nodes.get(firstBefore).value='-1';submit();assert.equal(nodes.get(firstBefore).attributes['aria-invalid'],'true');
    beforeIds.forEach(id=>nodes.get(`duration-${id}`).value=String(240/beforeIds.length));
    submit();assert.ok(nodes.has(firstAfter));
    nodes.get('q-back').onclick();assert.equal(nodes.get(firstBefore).value,String(240/beforeIds.length));submit();
    afterIds.forEach(id=>nodes.get(`duration-${id}`).value=String(30/afterIds.length));nodes.get('q-save').onclick();
    assert.equal(Q.draft('00000001').step,2);assert.equal(Q.records().length,0);
    run();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(nodes.get(firstAfter).value,String(30/afterIds.length));submit();
    nodes.get('status-paper').value='unknown';nodes.get('status-errors').value='na';submit();
    assert.ok(app.html.includes('-87.5%'));assert.equal(Q.records().length,0);
    submit();assert.equal(nodes.get('confirm-dialog').open,true);
    nodes.get('q-cancel').onclick();assert.equal(Q.records().length,0);
    Q.submitToBackend=async()=>({success:true});
    submit();const confirm=nodes.get('q-confirm').onclick;await confirm();await confirm();
    assert.equal(Q.records().length,1);assert.equal(Q.records()[0].values.time.before,240);assert.equal(Q.draft('00000001'),null);
    assert.equal(!!Q.records()[0].config.isDemo,mode==='demo');
});
test('local HTML scripts and styles resolve to existing files, and user navigation contains no admin links',()=>{
    const files=['frontend/user/index.html','frontend/user/effectiveness/evaluation.html','frontend/admin/manage/processes.html','frontend/admin/dashboard.html',...['index','evaluation','satisfaction'].map(p=>`frontend/user/satisfaction/${p}.html`)];
    for(const file of files) {
        const absolute=path.join(root,file),html=fs.readFileSync(absolute,'utf8');
        for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
            const url=match[1];if(/^(?:https?:|mailto:|#)/.test(url)||!/[.](?:js|css)$/.test(url))continue;
            assert.ok(fs.existsSync(path.resolve(path.dirname(absolute),url)),`${file}: ${url}`);
        }
        if (file === 'frontend/user/index.html') {
            assert.ok(html.includes('id="primary-nav"'));
        } else if (file === 'frontend/user/effectiveness/evaluation.html') {
            assert.ok(html.includes('assets/js/layout/site-header.js'));
            assert.ok(html.includes('assets/js/user/evaluation-locale.js'));
        } else if (file === 'frontend/admin/dashboard.html') {
            assert.ok(html.includes('id="quantitative-results"'));
            assert.ok(html.includes('id="app-sidebar"'));
            assert.ok(html.includes('assets/js/admin/admin-results.js'));
        } else {
            assert.ok(html.includes('assets/js/layout/site-header.js'));
        }
    }
});
