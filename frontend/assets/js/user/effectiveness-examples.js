(function (root) {
    'use strict';
    const groups = {
        generic: {
            th: { before: [['รับคำขอ', 'รับและบันทึกคำขอผ่านช่องทางเดิม'], ['ส่งต่อคำขอ', 'ส่งให้ผู้รับผิดชอบตรวจสอบ'], ['ตรวจสอบและดำเนินการ', 'ตรวจสอบข้อมูลและดำเนินการตามคำขอ'], ['แจ้งผล', 'แจ้งผลแก่ผู้ส่งคำขอ']], after: [['ส่งคำขอผ่านระบบ', 'กรอกและส่งคำขอผ่านระบบสารสนเทศ'], ['ระบบส่งต่อคำขอ', 'ระบบส่งคำขอให้ผู้รับผิดชอบ'], ['ตรวจสอบและดำเนินการในระบบ', 'ตรวจสอบข้อมูลและบันทึกผลในระบบ'], ['แจ้งผลผ่านระบบ', 'ระบบแจ้งสถานะหรือผลการดำเนินการ']] },
            en: { before: [['Receive request', 'Receive and record a request through the former channel'], ['Route request', 'Send the request to the responsible person'], ['Review and process', 'Review details and process the request'], ['Notify outcome', 'Inform the requester of the outcome']], after: [['Submit through system', 'Enter and submit a request through the information system'], ['System routes request', 'The system sends the request to the responsible person'], ['Review and process in system', 'Review details and record the outcome in the system'], ['Notify through system', 'The system reports status or outcome']] }
        },
        attendance: {
            th: { before: [['รวบรวมเวลาปฏิบัติงาน', 'ตรวจเอกสารหรือบันทึกเวลาเดิม'], ['ตรวจสอบความครบถ้วน', 'ตรวจสอบรายการและขอข้อมูลเพิ่มเมื่อจำเป็น'], ['สรุปผล', 'สรุปเวลาและแจ้งผล']], after: [['บันทึกเวลาในระบบ', 'บันทึกเวลาและหลักฐานผ่านระบบ'], ['ตรวจสอบรายการในระบบ', 'ตรวจสอบและอนุมัติรายการในระบบ'], ['สรุปผลในระบบ', 'ระบบสรุปและแจ้งผล']] },
            en: { before: [['Collect work hours', 'Review existing time records'], ['Check completeness', 'Review entries and request missing information'], ['Summarize results', 'Summarize hours and notify the user']], after: [['Record hours in system', 'Enter time and supporting information in the system'], ['Review entries in system', 'Review and approve entries in the system'], ['System summary', 'The system summarizes and reports results']] }
        },
        document: {
            th: { before: [['รับหนังสือ', 'รับและลงทะเบียนหนังสือ'], ['ส่งต่อเอกสาร', 'ส่งเอกสารให้หน่วยงานหรือผู้รับผิดชอบ'], ['ติดตามผล', 'สอบถามสถานะและแจ้งผล']], after: [['รับหนังสือในระบบ', 'ลงทะเบียนหนังสือในระบบ'], ['ส่งต่อในระบบ', 'กำหนดผู้รับผิดชอบและติดตามสถานะ'], ['แจ้งผลในระบบ', 'ระบบบันทึกและแจ้งผล']] },
            en: { before: [['Receive document', 'Receive and register a document'], ['Route document', 'Send the document to the responsible unit'], ['Track outcome', 'Check status and notify the requester']], after: [['Register in system', 'Register the document in the system'], ['Route in system', 'Assign responsibility and track status'], ['Notify in system', 'The system records and reports the outcome']] }
        },
        finance: {
            th: { before: [['รับคำขอทางการเงิน', 'รับแบบฟอร์มและเอกสารประกอบ'], ['ตรวจสอบเอกสาร', 'ตรวจสอบความครบถ้วนและส่งต่อ'], ['พิจารณาและแจ้งผล', 'บันทึกผลและแจ้งผู้ส่งคำขอ']], after: [['ส่งคำขอในระบบ', 'แนบข้อมูลและส่งคำขอผ่านระบบ'], ['ตรวจสอบสถานะ', 'ตรวจเอกสารและส่งต่อในระบบ'], ['อนุมัติและแจ้งผล', 'บันทึกผลและแจ้งผ่านระบบ']] },
            en: { before: [['Receive finance request', 'Receive the form and supporting documents'], ['Review documents', 'Check completeness and route the request'], ['Review and notify', 'Record the decision and notify the requester']], after: [['Submit in system', 'Attach information and submit through the system'], ['Check status', 'Review documents and route in the system'], ['Approve and notify', 'Record and report the decision in the system']] }
        },
        facilities: {
            th: { before: [['รับคำขอใช้ทรัพยากร', 'รับคำขอใช้ห้องหรือครุภัณฑ์'], ['ตรวจสอบความพร้อม', 'ตรวจตารางหรือสถานะทรัพยากร'], ['ยืนยันและแจ้งผล', 'บันทึกการจัดสรรและแจ้งผล']], after: [['ส่งคำขอผ่านระบบ', 'เลือกทรัพยากรและส่งคำขอในระบบ'], ['ตรวจสอบความพร้อมในระบบ', 'ระบบแสดงสถานะและส่งต่อผู้รับผิดชอบ'], ['ยืนยันและแจ้งผล', 'ระบบบันทึกการจัดสรรและแจ้งผล']] },
            en: { before: [['Receive resource request', 'Receive a room or equipment request'], ['Check availability', 'Review the schedule or resource status'], ['Confirm and notify', 'Record the allocation and notify the requester']], after: [['Submit through system', 'Select a resource and submit a request'], ['Check availability in system', 'The system shows status and routes the request'], ['Confirm and notify', 'The system records the allocation and reports the outcome']] }
        }
    };
    const systemGroups = { SYS003:'attendance', SYS011:'document', SYS013:'finance', SYS016:'facilities', SYS017:'facilities', SYS018:'facilities', SYS020:'finance', SYS021:'finance' };
    const metricRows = [
        ['accept_time','ความรวดเร็ว','เวลารับเรื่อง','Request acceptance time','ชั่วโมง','hours','decrease','เวลารับเรื่อง − เวลาส่งคำขอ','Acceptance timestamp in register → system submission or receipt timestamp',8],
        ['done_time','ความรวดเร็ว','เวลาดำเนินการเสร็จ','Request completion time','วัน','days','decrease','วันที่เสร็จ − วันที่ส่งคำขอ','Signed completion date → system closure timestamp',12],
        ['on_time','ความรวดเร็ว','งานเสร็จตามกำหนด','Completed on schedule','%','%','increase','งานที่เสร็จภายใน SLA ÷ งานที่เสร็จทั้งหมด × 100','Use the same SLA and closure-time data in both systems',10],
        ['complete_first','คุณภาพ','ข้อมูลครบถ้วนตั้งแต่ส่งคำขอครั้งแรก','Complete on first submission','%','%','increase','คำขอที่ไม่ต้องถามข้อมูลเพิ่ม ÷ คำขอทั้งหมด × 100','Requester follow-up check at closure in both systems',8],
        ['repeat','คุณภาพ','งานที่ต้องส่งคำขอซ้ำ','Repeat requests','%','%','decrease','คำขอเรื่องเดิมที่ส่งซ้ำภายใน 30 วัน ÷ คำขอทั้งหมด × 100','Review the same 30-day period in both systems',9],
        ['lost','คุณภาพ','คำขอสูญหายหรือส่งผิดหน่วย','Lost or misrouted requests','%','%','decrease','คำขอที่สูญหายหรือส่งผิดหน่วย ÷ คำขอทั้งหมด × 100','Register or unit inquiry → system routing history',8],
        ['sat_requester','ความพึงพอใจ','ความพึงพอใจของผู้ส่งคำขอ','Requester satisfaction','1–5','1–5','increase','ค่าเฉลี่ยคะแนนแบบสำรวจผู้ส่งคำขอ','Requester survey',15],
        ['sat_staff','ความพึงพอใจ','ความพึงพอใจของผู้ดำเนินการและเจ้าหน้าที่','Staff satisfaction','1–5','1–5','increase','ค่าเฉลี่ยคะแนนแบบสำรวจเจ้าหน้าที่','Staff survey',10],
        ['requester_minutes','ภาระงานและต้นทุน','เวลาที่ผู้ส่งคำขอใช้ต่อครั้ง','Requester time per request','นาที','minutes','decrease','เวลาตั้งแต่เริ่มกรอกจนคำขอถึงผู้รับ รวมเวลาเดินส่งเอกสารถ้ามี','Requester survey; excludes total process time',5],
        ['staff_minutes','ภาระงานและต้นทุน','เวลาจัดการเอกสารของเจ้าหน้าที่ต่อเรื่อง','Staff handling time per request','นาที','minutes','decrease','เวลารับ ลงทะเบียน ส่งต่อ บันทึกผล และปิดงาน','Staff survey',7],
        ['cost_per_case','ภาระงานและต้นทุน','ต้นทุนรวมต่อเรื่อง','Total cost per request','บาท','THB','decrease','(วัสดุ + ค่าระบบ + ค่าแรง + ค่าเสื่อมต้นทุนครั้งเดียว) ÷ จำนวนเรื่อง','Supply records → invoices or contracts and staff time records',8]
    ];
    const metrics = metricRows.map(([id,dimension,nameTh,nameEn,unitTh,unitEn,direction,formulaTh,sourceEn,weight]) => ({ id, dimension:{th:dimension,en:({ความรวดเร็ว:'Speed',คุณภาพ:'Quality',ความพึงพอใจ:'Satisfaction',ภาระงานและต้นทุน:'Workload and cost'})[dimension]}, name:{th:nameTh,en:nameEn}, unit:{th:unitTh,en:unitEn}, direction, formula:{th:formulaTh,en:sourceEn}, source:{th:sourceEn,en:sourceEn}, weight }));
    function processExamples(systemId, language='th') {
        const group=groups[systemGroups[systemId] || 'generic'][language] || groups.generic[language];
        const prefix=systemId || 'generic';
        return Object.fromEntries(['before','after'].map(phase=>[phase,group[phase].map(([name,description],i)=>({id:`example-${prefix}-${phase}-${i+1}`,name,description,active:true,timed:true}))]));
    }
    const api={ groups, systemGroups, metrics, processExamples, localized(metric,language='th') { return { ...metric, dimension:metric.dimension[language], name:metric.name[language], unit:metric.unit[language], formula:metric.formula[language], sourceText:metric.source[language] }; } };
    root.EffectivenessExamples=api;
    if(typeof module!=='undefined') module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
