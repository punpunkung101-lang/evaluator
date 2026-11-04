const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('energy stepper fills and drains all five stages with exactly one current step',()=>{
    const context={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/Effectiveness_Of_It/main/assets/js/energy-stepper.js'),'utf8'),context);
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
    vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/Effectiveness_Of_It/main/assets/js/quantitative-data.js'),'utf8'),context);
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
    const config=Q.config('CUSTOM001');
    config.before.push({id:'before1',name:'Paper request',active:true,timed:true});
    const saved=Q.saveConfig('CUSTOM001',config);
    Q.submit({id:'record1',config:saved,values:{}});
    config.before[0].name='Renamed';config.before.push({id:'before2',name:'Approval',active:true,timed:false});
    config.metrics[2].active=false;
    Q.saveConfig('CUSTOM001',config);
    assert.equal(Q.config('CUSTOM001').before.length,2);
    assert.equal(Q.config('CUSTOM001').metrics[2].active,false);
    assert.equal(Q.records()[0].config.before[0].name,'Paper request');
    assert.equal(Q.records()[0].config.before.length,1);
    assert.equal(Q.config('CUSTOM001').version,undefined);
    assert.equal(Q.config('CUSTOM002').before.length,0);
});
test('draft resumes separately from submitted records and confirmation is idempotent',()=>{
    const {Q,store}=setup(), draft={id:'one',step:2,values:{paper:{status:'unknown'}}};
    Q.saveDraft(draft); assert.equal(Q.draft().step,2); assert.equal(Q.records().length,0);
    Q.submit(draft);Q.submit(draft);
    assert.equal(Q.records().length,1);assert.equal(Q.draft(),null);
    assert.ok(!store.has('it_evaluations_store'));
});
test('storage errors propagate rather than reporting success',()=>{
    const {Q,store}=setup();store.set(Q.keys.records,'invalid JSON');
    assert.throws(()=>Q.submit({id:'bad'}));
});
test('all catalog templates are usable, and configured systems retain their saved settings', () => {
    const {Q,store}=setup();
    const firstSteps=new Set();
    for(let i=1;i<=21;i++){
        const id='SYS'+String(i).padStart(3,'0');
        const config=Q.config(id);
        assert.ok(config.before.length && config.after.length);
        firstSteps.add(config.before[0].name);
        assert.ok(config.metrics.some(metric=>metric.category==='effectiveness' && metric.unit==='%'));
    }
    assert.equal(firstSteps.size,21);
    assert.equal(store.has(Q.keys.config),false);
    const saved=Q.saveConfig('SYS001',Q.defaults());
    assert.equal(saved.version,undefined);
    assert.equal(Q.config('SYS001').before.length,0);
});

test('effectiveness uses measured outcomes and allows a missing baseline', () => {
    const {Q}=setup();
    const metric={...Q.config('SYS001').metrics.find(m=>m.id==='outcome'),target:90};
    assert.equal(Q.effectiveness(metric,{status:'after-only',after:90}),true);
    assert.equal(Q.effectiveness(metric,{status:'known',before:70,after:89}),false);
    assert.equal(Q.effectiveness(metric,{status:'known',before:70,after:101}),null);
    assert.equal(Q.effectiveness({...metric,source:'time'},{status:'known',after:95}),null);
    assert.equal(Q.effectiveness({...metric,target:null},{status:'known',after:95}),null);
    assert.equal(Q.calculate(metric,{status:'after-only',after:90}).available,false);
});

test('reading legacy settings preserves process snapshots and does not write stored data', () => {
    const {Q,store}=setup();
    const step={id:'original',name:'Original',description:'Keep',active:true,timed:false};
    const old={version:7,before:[step],after:[step],metrics:[{id:'time',source:'time',unit:'นาที',active:false}]};
    store.set(Q.keys.config,JSON.stringify({SYS018:old}));
    Q.saveDraft({id:'old-draft',config:old});
    store.set(Q.keys.records,JSON.stringify([{id:'old-record',config:old}]));
    const snapshot=new Map(store);
    const config=Q.config('SYS018');
    assert.deepEqual(JSON.parse(JSON.stringify(config.before)),old.before);
    assert.deepEqual(JSON.parse(JSON.stringify(config.after)),old.after);
    assert.equal(config.version,7);
    assert.equal(config.metrics.length,1);
    assert.equal(config.metrics[0].active,false);
    assert.deepEqual(store,snapshot);
    assert.equal(Q.rate(9,10),90);
    assert.equal(Q.rate(0,10),0);
    for (const pair of [[0,0],[11,10],[1.5,10],[null,10]]) assert.equal(Q.rate(...pair),null);
});

test('system-specific KPI survives reload alongside the five standard KPIs', () => {
    const {Q}=setup();
    const config=Q.config('SYS018');
    const processes=JSON.stringify([config.before,config.after]);
    config.metrics.push({id:'extra',custom:true,name:'งานแก้ไขซ้ำ',description:'นับงานแก้ไขซ้ำ',
        unit:'ครั้ง',basis:'ต่องาน 100 รายการ',category:'effectiveness',source:'manual',direction:'decrease',target:3,active:true});
    Q.saveConfig('SYS018',config);
    const reloaded=Q.config('SYS018');
    assert.equal(reloaded.metrics.length,6);
    assert.equal(reloaded.metrics.find(metric=>metric.id==='extra').target,3);
    assert.equal(Q.effectiveness(reloaded.metrics[5],{status:'known',before:8,after:2}),true);
    assert.equal(JSON.stringify([reloaded.before,reloaded.after]),processes);
    assert.equal(Q.config('SYS017').metrics.length,5);
    reloaded.metrics.splice(5,1);
    Q.saveConfig('SYS018',reloaded);
    assert.equal(Q.config('SYS018').metrics.length,5);
});

test('outcome comparison requires equivalent nonoverlapping reference periods', () => {
    const {Q}=setup();
    const metric={...Q.config('SYS018').metrics.find(item=>item.input==='ratio'),periodMode:'month',target:75};
    const values={status:'known',before:50,after:80,periods:{before:{start:'2024-02'},after:{start:'2024-03'}}};
    assert.equal(Q.calculate(metric,values).delta,30);
    assert.equal(Q.calculate({...metric,periodMode:undefined},values).reason,'ยังไม่ระบุช่วงเวลาข้อมูล');
    values.periods.after.start='2024-02';
    assert.equal(Q.calculate(metric,values).available,false);
    assert.equal(Q.effectiveness(metric,values),true);
    assert.equal(Q.periodBounds('day',{start:'2025-02-29'}),null);
    assert.equal(Q.periodIssue({...metric,periodMode:'custom'},{...values,periods:{
        before:{start:'2024-01-01',end:'2024-01-10'},after:{start:'2024-02-01',end:'2024-02-10'}
    }}),'');
    assert.ok(Q.periodIssue({...metric,periodMode:'custom'},{...values,periods:{
        before:{start:'2024-01-01',end:'2024-01-10'},after:{start:'2024-02-01',end:'2024-02-11'}
    }}));
});

test('legacy outcome config becomes a ratio without changing other metrics or stored snapshots', () => {
    const {Q,store}=setup();
    const config=Q.config('SYS018');
    const metric=config.metrics.find(item=>item.id==='outcome');
    delete metric.input;
    metric.target=91;
    metric.periodMode='month';
    config.metrics.push({id:'custom',custom:true,source:'manual',unit:'ครั้ง'});
    store.set(Q.keys.config,JSON.stringify({SYS018:config}));
    const original=store.get(Q.keys.config);
    const updated=Q.config('SYS018');
    assert.equal(updated.metrics.find(item=>item.id==='outcome').input,'ratio');
    assert.equal(updated.metrics.find(item=>item.id==='outcome').target,91);
    assert.equal(updated.metrics.find(item=>item.id==='outcome').periodMode,'month');
    assert.equal(updated.metrics.at(-1).id,'custom');
    assert.equal(store.get(Q.keys.config),original);
});

test('editing current settings does not create versions or alter other systems and historic results', () => {
    const {Q,store}=setup();
    const original=Q.config('SYS018');
    const other=Q.config('SYS017');
    const configs={SYS018:{...original,version:7,release:'1.0'},SYS017:other};
    const records=[{id:'old',systemId:'SYS018',config:configs.SYS018}];
    store.set(Q.keys.config,JSON.stringify(configs));
    store.set(Q.keys.records,JSON.stringify(records));
    const current=Q.config('SYS018');
    current.metrics.find(metric=>metric.id==='outcome').target=95;
    const saved=Q.saveConfig('SYS018',current);
    assert.equal(saved.version,undefined);
    assert.equal(saved.release,undefined);
    assert.equal(Q.config('SYS018').metrics.find(metric=>metric.id==='outcome').target,95);
    assert.equal(JSON.stringify([saved.before,saved.after]),JSON.stringify([original.before,original.after]));
    assert.equal(JSON.stringify(Q.config('SYS017')),JSON.stringify(other));
    assert.equal(store.get(Q.keys.records),JSON.stringify(records));
});

for (const mode of ['configured', 'demo', 'refresh']) test(`wizard completes with ${mode} processes, validates and preserves draft values`,async()=>{
    const {Q,context}=setup();
    const config=Q.defaults();
    config.before=[{id:'b',name:'Before',active:true,timed:true}];
    config.after=[{id:'a',name:'After',active:true,timed:true}];
    if (mode === 'configured') Q.saveConfig('CUSTOM001',config);
    context.window={Quantitative:Q};
    vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/Effectiveness_Of_It/main/assets/js/energy-stepper.js'),'utf8'),context);
    Q.systems=()=>[{id:'CUSTOM001',name:'Leave'}];
    context.crypto={randomUUID:()=> 'wizard-test'};
    context.URLSearchParams=URLSearchParams;context.location={search:''};
    context.sessionStorage={getItem:()=>null};
    const nodes=new Map();
    const decode=s=>String(s??'').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
    function node(id,value='') { return {id,value,textContent:'',attributes:{},disabled:false,focus(){},addEventListener(type,fn){this[type]=fn;},setAttribute(k,v){this.attributes[k]=v;},showModal(){this.open=true;},close(){this.open=false;}}; }
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
    context.document={body:{dataset:{quantPage:'evaluation'}},getElementById:id=>id==='quant-app'?app:nodes.get(id)};
    const run=()=>vm.runInNewContext(fs.readFileSync(path.join(root,'frontend/Effectiveness_Of_It/main/assets/js/quantitative.js'),'utf8'),context);
    const submit=()=>nodes.get('wizard-form').onsubmit({preventDefault(){}});
    run();submit();assert.equal(nodes.get('q-name').attributes['aria-invalid'],'true');
    for(const [id,value] of [['q-name','Test'],['q-role','staff'],['q-department','Test dept'],['q-system','CUSTOM001']])nodes.get(id).value=value;
    submit();
    if(mode!=='configured') {
        assert.ok(nodes.has('q-use-demo'));
        assert.equal(Q.records().length,0);
        if(mode==='demo') {nodes.get('q-use-demo').click();assert.ok(app.html.includes('ข้อมูลจำลอง'));assert.equal(Q.config('CUSTOM001').before.length,0);}
        else {Q.saveConfig('CUSTOM001',config);await nodes.get('q-refresh-config').click();}
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
    assert.equal(Q.draft().step,2);assert.equal(Q.records().length,0);
    run();assert.equal(nodes.get(firstAfter).value,String(30/afterIds.length));submit();
    nodes.get('status-paper').value='unknown';nodes.get('status-errors').value='na';
    if (nodes.has('status-outcome')) {
        nodes.get('status-outcome').value='known';
        for (const [id,value] of [['before-outcome-success',1],['before-outcome-total',10],['after-outcome-success',9],['after-outcome-total',10]]) nodes.get(id).value=String(value);
        nodes.get('before-paper').value='12';
        nodes.get('after-paper').value='5';
        for (const [status,before,after] of [
            ['known',true,true],['after-only',false,true],['unknown',false,false],['na',false,false],['known',true,true]
        ]) {
            for (const id of ['outcome','paper']) {
                const select=nodes.get(`status-${id}`);
                select.value=status;
                select.onchange();
                assert.equal(nodes.get(`before-${id}-fields`).hidden,!before);
                assert.equal(nodes.get(`after-${id}-fields`).hidden,!after);
            }
            nodes.get('wizard-form').oninput();
            const saved=Q.draft().values;
            assert.equal(saved.outcome.status,status);
            assert.equal(saved.paper.status,status);
            assert.equal(saved.outcome.before,before?10:null);
            assert.equal(saved.outcome.after,after?90:null);
            assert.equal(saved.paper.before,before?12:null);
            assert.equal(saved.paper.after,after?5:null);
            if (!before) assert.equal(nodes.get('delta-outcome').textContent,'');
        }
        nodes.get('wizard-form').oninput();
        assert.ok(nodes.get('before-outcome-rate').textContent.includes('10%'));
        assert.ok(nodes.get('after-outcome-rate').textContent.includes('90%'));
        run();
        assert.equal(nodes.get('after-outcome-success').value,'9');
        assert.ok(nodes.get('after-outcome-rate').textContent.includes('90%'));
    }
    submit();
    assert.ok(app.html.includes('-87.5%'));assert.equal(Q.records().length,0);
    submit();assert.equal(nodes.get('confirm-dialog').open,true);
    nodes.get('q-cancel').onclick();assert.equal(Q.records().length,0);
    submit();const confirm=nodes.get('q-confirm').onclick;await confirm();await confirm();
    assert.equal(Q.records().length,1);assert.equal(Q.records()[0].values.time.before,240);assert.equal(Q.draft(),null);
    assert.equal(!!Q.records()[0].config.isDemo,mode==='demo');
});
test('local HTML scripts and styles resolve to existing files, and user navigation contains no admin links',()=>{
    const files=['frontend/Effectiveness_Of_It/main/index.html','frontend/Effectiveness_Of_It/main/evaluation.html','frontend/Effectiveness_Of_It/main/admin.html','frontend/Satisfaction_Survey/admin/dashboard.html',...['index','evaluation','satisfaction'].map(p=>`frontend/Satisfaction_Survey/user/${p}.html`)];
    for(const file of files) {
        const absolute=path.join(root,file),html=fs.readFileSync(absolute,'utf8');
        for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
            const url=match[1];if(/^(?:https?:|mailto:|#)/.test(url)||!/[.](?:js|css)$/.test(url))continue;
            assert.ok(fs.existsSync(path.resolve(path.dirname(absolute),url)),`${file}: ${url}`);
        }
        if (file === 'frontend/Effectiveness_Of_It/main/index.html') {
            assert.ok(!html.includes('assets/js/sidebar.js'));
            assert.ok(html.includes('id="primary-nav"'));
        } else if (file === 'frontend/Effectiveness_Of_It/main/evaluation.html') {
            assert.ok(html.includes('assets/js/evaluation-shell.js'));
            assert.ok(html.includes('assets/js/evaluation-locale.js'));
        } else if (file === 'frontend/Satisfaction_Survey/admin/dashboard.html') {
            assert.ok(html.includes('id="quantitative-results"'));
            assert.ok(html.includes('assets/js/admin-results.js'));
        } else {
            assert.ok(html.includes('assets/js/sidebar.js'));
        }
    }
});
