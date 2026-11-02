const test=require('node:test');
const assert=require('node:assert/strict');
const {summarize,initialDataSet,presentation}=require('../frontend/Effectiveness_Of_It/main/assets/js/admin-results.js');
const {calculate}=require('../frontend/Effectiveness_Of_It/main/assets/js/quantitative-data.js');
function record(options={}) { return {systemId:'SYS001',submittedAt:'2026-11-03T00:00:00Z',config:{version:1,metrics:[{id:'time',name:'เวลา',unit:'นาที',basis:'ต่อคำขอ',source:'time',direction:'decrease',active:true}]},values:{time:{status:'known',before:240,after:30}},...options}; }
test('first dashboard visit shows demo results when they are the only submitted records',()=>{
    const demo=record();demo.config.isDemo=true;
    assert.equal(initialDataSet([demo]),'demo');
    assert.equal(summarize([demo],{demo:initialDataSet([demo])}).records.length,1);
    assert.equal(initialDataSet([demo,record()]),'real');
    assert.equal(initialDataSet([]),'real');
});
test('comparable values are averaged; versions and measurement bases stay separate',()=>{
    const a=record(),b=record({values:{time:{status:'known',before:120,after:10}}}),c=record();
    c.config.version=2;
    const d=record();d.config.metrics[0].basis='ต่อปี';
    const summary=summarize([a,b,c,d]);
    assert.equal(summary.groups.length,3);assert.equal(summary.groups[0].before,180);assert.equal(summary.groups[0].after,20);assert.equal(summary.groups[0].count,2);
});
test('demo data, system and dates are filtered before counts and calculations',()=>{
    const demo=record();demo.config.isDemo=true;
    const other=record({systemId:'SYS002'});
    assert.equal(summarize([record(),demo,other],{system:'SYS001'}).records.length,1);
    assert.equal(summarize([record(),demo],{demo:'demo'}).records.length,1);
    assert.equal(summarize([record()],{start:'2026-11-04'}).systems,0);
    assert.equal(summarize([record()],{periodPrefix:'2026-10'}).groups.length,0);
});
test('unknown data is excluded from averages while a genuine zero remains valid',()=>{
    const unknown=record({values:{time:{status:'unknown',before:null,after:null}}});
    const zero=record({values:{time:{status:'known',before:0,after:0}}});
    const summary=summarize([unknown,zero,null,{}]);
    assert.equal(summary.unavailable,1);assert.equal(summary.groups[0].count,1);assert.equal(summary.groups[0].before,0);assert.equal(summary.targets,0);
});
test('result tones follow the metric direction rather than the sign of the delta',()=>{
    const value=(before,after)=>({status:'known',before,after});
    assert.equal(presentation({direction:'decrease'},value(240,30),calculate).tone,'good');
    assert.equal(presentation({direction:'decrease'},value(4,8),calculate).tone,'bad');
    assert.equal(presentation({direction:'increase'},value(10,20),calculate).tone,'good');
    assert.equal(presentation({direction:'increase'},value(20,10),calculate).tone,'bad');
    assert.equal(presentation({direction:'decrease'},value(0,0),calculate).tone,'neutral');
    assert.equal(presentation({direction:'decrease'},value(0,8),calculate).percent,null);
    assert.equal(presentation({direction:'decrease'},{status:'unknown'},calculate).tone,'missing');
});
test('unavailable metric cards remain visible without changing comparable group counts',()=>{
    const data=record({values:{time:{status:'unknown'}}});
    const summary=summarize([data]);
    assert.equal(summary.groups.length,0);assert.equal(summary.displayGroups.length,1);assert.equal(summary.displayGroups[0].before,null);
});
test('below-target KPI counts evaluations, independently of the configured-target count',()=>{
    const low=record(),met=record(),unknown=record();
    for(const r of [low,met,unknown])Object.assign(r.config.metrics[0],{direction:'target',target:100});
    low.values.time.after=50;met.values.time.after=100;unknown.values.time.status='unknown';
    const summary=summarize([low,met,unknown]);
    assert.equal(summary.belowTarget,1);assert.equal(summary.targets,3);
});
