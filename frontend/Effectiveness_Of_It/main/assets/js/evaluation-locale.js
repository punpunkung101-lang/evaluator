(function(root) {
    'use strict';
    // UI copy only. User/catalog content is explicitly excluded with data-user-content.
    const en = {
        'ศูนย์ประเมินระบบสารสนเทศ (IT Evaluator)':'Information Systems Evaluation Centre (IT Evaluator)',
        'คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร':'Faculty of Allied Health Sciences, Naresuan University',
        'ประเมินประสิทธิภาพและประสิทธิผล':'Efficiency & Effectiveness Evaluation',
        'เปรียบเทียบข้อมูลการทำงานก่อนและหลังใช้ระบบสารสนเทศ':'Compare work processes before and after using information systems',
        'ประเมินความพึงพอใจ':'Satisfaction Evaluation','หน้าแรก / ภาพรวม':'Home / Overview','หน้าหลัก':'Home',
        'ติดต่อเรา':'Contact us','คู่มือการใช้งาน':'User guide','เกี่ยวกับ':'About','เมนูหลัก':'Main navigation','เปิดเมนู':'Open menu','ปิดเมนู':'Close menu',
        'เข้าสู่ระบบ — ยังไม่พร้อมใช้งาน':'Sign in — not available yet','ยังไม่มีระบบเข้าสู่ระบบจริง':'Authentication is not available yet',
        'ธีมสว่าง':'Light mode','ธีมมืด':'Dark mode','ภาษาไทย':'Thai','ภาษาอังกฤษ':'English',
        'ตรามหาวิทยาลัยนเรศวร':'Naresuan University emblem',
        'ข้อมูลผู้ประเมิน':'Evaluator information','กระบวนการก่อนใช้ IT':'Before IT','กระบวนการหลังใช้ IT':'After IT','ตัวชี้วัด':'Indicators','ตรวจสอบและส่ง':'Review & submit',
        'ชื่อ–นามสกุล / นามสมมุติ':'Full name / pseudonym','ประเภทผู้ประเมิน':'Evaluator type','เลือกประเภท':'Select a role','นิสิต':'Student','อาจารย์':'Academic staff','บุคลากร':'Support staff','หน่วยงาน / สังกัด':'Department / affiliation','ระบบ IT':'IT system','เลือกระบบ IT':'Select an IT system',
        'ย้อนกลับ':'Back','บันทึกแบบร่าง':'Save draft','ถัดไป':'Next','ตรวจสอบและยืนยัน':'Review & confirm','กลับไปตรวจสอบ':'Back to review','ยืนยันการส่งข้อมูล':'Confirm submission',
        'กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนยืนยัน':'Please review your information before confirming',
        'ข้อมูลทดลองจะเก็บเฉพาะเบราว์เซอร์นี้':'Test data is stored only in this browser',
        'กรุณากรอกชื่อหรือนามสมมุติ':'Enter your name or a pseudonym','กรุณาเลือกประเภทผู้ประเมิน':'Select an evaluator type','กรุณากรอกหน่วยงาน':'Enter your department','กรุณาเลือกระบบ IT':'Select an IT system',
        'กรุณาตรวจสอบช่องที่มีข้อความแจ้งเตือนก่อนดำเนินการต่อ':'Check the highlighted fields before continuing',
        'กรุณาระบุเวลาตั้งแต่ 0 ขึ้นไป หรือเลือกไม่ทราบข้อมูล':'Enter a duration of 0 or more, or select Unknown',
        'กรุณาระบุค่าที่ไม่ติดลบ และใช้จำนวนเต็มสำหรับกระดาษ/ข้อผิดพลาด':'Enter a non-negative value; paper and errors require whole numbers',
        'กรุณาเลือกสถานะข้อมูล':'Select a data status','สถานะข้อมูลเวลา':'Duration data status','สถานะข้อมูล':'Data status','เลือกสถานะ':'Select a status','มีข้อมูล':'Known','ไม่ทราบข้อมูล':'Unknown','ไม่เกี่ยวข้อง':'Not applicable',
        'เวลาที่ใช้ (นาที)':'Duration (minutes)','ฐานการวัดเวลา:':'Time measurement basis:','ใช้ฐานเดียวกันก่อนและหลัง':'Use the same basis before and after',
        'ขั้นตอนนี้ไม่เก็บเวลา':'This step does not collect duration','ระบบนี้ยังไม่ได้กำหนดกระบวนการ':'Processes have not been configured for this system',
        'ยังเริ่มประเมินจริงไม่ได้ หากผู้ดูแลตั้งค่าไว้แล้ว ให้โหลดการตั้งค่าล่าสุด หรือเลือกใช้กระบวนการตัวอย่างเพื่อทดลองกรอกฟอร์ม โดยจะระบุผลว่าเป็นข้อมูลจำลอง':'Processes are required. Load the latest administrator configuration, or use sample processes to try the form. Sample results are labeled as simulated data.',
        'โหลดการตั้งค่าล่าสุด':'Load latest configuration','ใช้กระบวนการตัวอย่าง (ข้อมูลจำลอง)':'Use sample processes (simulated data)',
        'ยังไม่กำหนดกระบวนการ กรุณาให้ผู้ดูแลตั้งค่าก่อน':'Ask the administrator to configure the processes first',
        'ยังไม่มีการตั้งค่าครบทั้งก่อนและหลัง ใช้กระบวนการตัวอย่างเพื่อทดลอง หรือรอผู้ดูแลตั้งค่า':'Both phases must be configured. Use sample processes or wait for the administrator.',
        'ยังไม่มีขั้นตอนให้ประเมิน':'No configured steps','เวลารวม:':'Total duration:','ยังมีข้อมูลไม่ครบ / ไม่ได้เก็บเวลา':'Incomplete data / no duration collected','ยังมีข้อมูลไม่ครบ':'Incomplete data','นาที':'minutes',
        'กำลังทดลองด้วยกระบวนการตัวอย่าง ข้อมูลจำลองนี้ไม่ใช่ข้อมูลจริงของคณะ':'Using sample processes. These simulated data are not actual faculty results.',
        'คำนวณจากกระบวนการ':'Calculated from processes','จำเป็นต้องระบุสถานะข้อมูล':'Data status required','ก่อนใช้ระบบ':'Before IT','หลังใช้ระบบ':'After IT',
        'แบบประเมินเวอร์ชัน':'Form version','ก่อนใช้ IT':'Before IT','หลังใช้ IT':'After IT','ไม่เก็บเวลา':'Duration not collected',
        'ยังไม่บันทึกเป็นรายการที่ส่ง จนกว่าจะยืนยันในหน้าต่างถัดไป':'This record is not submitted until you confirm in the next dialog',
        'ผลต่าง = ค่าใหม่ − ค่าเดิม · เปอร์เซ็นต์ติดลบหมายถึงค่าลดลง':'Difference = after − before. Negative percentages indicate a decrease.',
        'ก่อน':'Before','หลัง':'After','ผลต่าง':'Difference','การเปลี่ยนแปลง':'Change','ผล':'Result',
        'คำนวณเปอร์เซ็นต์ไม่ได้: ค่าเดิมเป็น 0':'Percentage unavailable: baseline is zero','ยังไม่ได้กำหนดเกณฑ์ประสิทธิผล':'Effectiveness criteria have not been defined',
        'ไม่สามารถคำนวณได้: ไม่มีข้อมูลครบถ้วน':'Cannot calculate: incomplete data','ถึงเป้าหมาย':'Target met','ยังไม่ถึงเป้าหมาย':'Target not met','เป้าหมาย':'Target','ดีขึ้น':'Improved','แย่ลง':'Worsened','คงเดิม':'Unchanged',
        'ข้อมูลจำลองจากกระบวนการตัวอย่าง ไม่ใช่ผลประเมินจริงของระบบ IT':'Simulated sample-process data, not actual IT system evaluation results',
        'บันทึกแบบร่างในเบราว์เซอร์แล้ว':'Draft saved in this browser','บันทึกข้อมูลทดลองในเบราว์เซอร์แล้ว':'Test evaluation saved in this browser',
        'ข้อมูลอยู่ในเบราว์เซอร์นี้ เปิด Dashboard ด้วยที่อยู่เว็บเดียวกันเพื่อดูผล':'Your data is stored in this browser. Open the dashboard on the same origin to view it.',
        'ดูผลที่ส่งใน Dashboard':'View submitted results','เริ่มแบบประเมินใหม่':'Start a new evaluation','ไม่สามารถดำเนินการได้:':'Unable to complete the action:',
        'เสร็จแล้ว':'Completed','กำลังดำเนินการ':'Current step','รอดำเนินการ':'Pending','ขั้นตอนการประเมิน':'Evaluation steps',
        'Frontend Prototype — แบบร่างและผลประเมินเก็บเฉพาะเบราว์เซอร์นี้ กรุณาใช้นามสมมุติ ไม่กรอกข้อมูลส่วนบุคคลจริง':'Frontend prototype — drafts and evaluations are stored only in this browser. Use a pseudonym; do not enter real personal information.',
        'Frontend Prototype — ข้อมูลเก็บเฉพาะเบราว์เซอร์นี้ กรุณาใช้นามสมมุติ ไม่กรอกข้อมูลส่วนบุคคลจริง':'Frontend prototype — data is stored only in this browser. Use a pseudonym rather than real personal information.',
        'ข้อมูลที่มีเครื่องหมาย * จำเป็นต้องกรอก':'Fields marked * are required',
        'กรอกข้อมูล':'Enter information','ระบุตัวเลขตั้งแต่ 0 ขึ้นไป':'Enter a value of 0 or more',
        'บันทึกแบบร่างเพื่อกลับมากรอกต่อได้ ตรวจสอบข้อมูลก่อนยืนยันส่ง':'Save a draft to resume later. Review your data before confirming submission.',
        'เว็บไซต์ต้นแบบสำหรับเปรียบเทียบการทำงานก่อนและหลังใช้ระบบ IT แยกจากแบบประเมินความพึงพอใจ':'A prototype for comparing work before and after IT adoption, separate from the satisfaction questionnaire.',
        'หากต้องการความช่วยเหลือ โปรดติดต่อผู้รับผิดชอบโครงการหรือผู้ดูแลระบบของคณะ':'For assistance, contact the project coordinator or the faculty system administrator.',
        'ปิด':'Close','ข้ามไปยังเนื้อหาหลัก':'Skip to main content',
        'จัดการกระบวนการและตัวชี้วัด':'Manage processes & indicators','Admin Dashboard เชิงปริมาณ':'Quantitative dashboard','Dashboard ความพึงพอใจ':'Satisfaction dashboard',
        'จัดการกระบวนการและตัวชี้วัด — โหมดผู้ดูแลจำลอง':'Manage processes & indicators — prototype admin',
        'ขั้นที่':'Step','จาก':'of','ระบบ':'System'
    };
    const keys=Object.keys(en).sort((a,b)=>b.length-a.length);
    const pattern=new RegExp(keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
    function translate(text,language) { return language==='en'?text.replace(pattern,match=>en[match]):text; }
    if(typeof module!=='undefined')module.exports={translate,dictionary:en};
    if(typeof document==='undefined')return;
    const LANG='it_eval_lang',THEME='it_eval_theme';
    function read(key,fallback){try{return localStorage.getItem(key)||fallback;}catch(_){return fallback;}}
    function write(key,value){try{localStorage.setItem(key,value);}catch(_){/* Preferences can still be used without persistent storage. */}}
    let language=read(LANG,'th')==='en'?'en':'th';
    let theme=read(THEME,'light')==='dark'?'dark':'light';
    const originals=new WeakMap(),attributes=new WeakMap();
    function apply(container=document.body){
        const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
        let node;
        while((node=walker.nextNode())){
            if(!node.parentElement||node.parentElement.closest('script,style,textarea,code,[data-user-content]'))continue;
            if(!node.nodeValue.trim())continue;
            const saved=originals.get(node);
            const source=saved&&node.nodeValue===saved.rendered?saved.source:node.nodeValue;
            const rendered=translate(source,language);
            originals.set(node,{source,rendered});if(node.nodeValue!==rendered)node.nodeValue=rendered;
        }
        container.querySelectorAll('[aria-label],[title],[placeholder],[alt]').forEach(element=>{
            if(element.closest('[data-user-content]'))return;
            const values=attributes.get(element)||{};
            for(const key of ['aria-label','title','placeholder','alt']){
                if(!element.hasAttribute(key))continue;
                const current=element.getAttribute(key),saved=values[key],source=saved&&current===saved.rendered?saved.source:current;
                const rendered=translate(source,language);values[key]={source,rendered};if(current!==rendered)element.setAttribute(key,rendered);
            }attributes.set(element,values);
        });
        document.documentElement.lang=language;
        document.title=language==='en'?'Efficiency & Effectiveness Evaluation | IT Evaluator':'ประเมินประสิทธิภาพและประสิทธิผล | IT Evaluator';
        document.documentElement.dataset.theme=theme;
        document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
        const toggle=document.getElementById('ev-theme');
        if(toggle){toggle.setAttribute('aria-pressed',String(theme==='dark'));toggle.setAttribute('aria-label',translate(theme==='dark'?'ธีมสว่าง':'ธีมมืด',language));toggle.querySelector('[data-theme-icon]').textContent=theme==='dark'?'☀':'☾';}
    }
    let scheduled=false;
    const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;observer.disconnect();apply();observe();});});
    function observe(){observer.observe(document.body,{childList:true,characterData:true,subtree:true});}
    root.EvaluationLocale={apply,translate:text=>translate(text,language),getLanguage:()=>language,setLanguage(value){language=value==='en'?'en':'th';write(LANG,language);apply();},setTheme(value){theme=value==='dark'?'dark':'light';write(THEME,theme);apply();}};
    apply();observe();
    root.addEventListener('storage',event=>{if(event.key===LANG){language=read(LANG,'th')==='en'?'en':'th';apply();}if(event.key===THEME){theme=read(THEME,'light')==='dark'?'dark':'light';apply();}});
})(typeof window!=='undefined'?window:globalThis);
