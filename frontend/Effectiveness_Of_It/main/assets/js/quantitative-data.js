(function (root) {
    'use strict';
    const keys = { config: 'it_quant_config_v1', records: 'it_quant_records_v1', draft: 'it_quant_draft_v1' };
    const clone = value => JSON.parse(JSON.stringify(value));
    function read(key, fallback) {
        const raw = localStorage.getItem(key);
        return raw === null ? clone(fallback) : JSON.parse(raw);
    }
    const standardMetrics = (basis = 'ต่อหนึ่งงานหรือหนึ่งคำขอ') => [
        {id:'time', name:'ระยะเวลาการทำงาน', unit:'นาที', basis, category:'efficiency', direction:'decrease', source:'time', active:true, required:true},
        {id:'steps', name:'จำนวนขั้นตอนการทำงาน', unit:'ขั้นตอน', basis, category:'efficiency', direction:'decrease', source:'steps', active:true, required:true},
        {id:'paper', name:'จำนวนกระดาษที่ใช้', unit:'แผ่น', basis, category:'efficiency', direction:'decrease', source:'manual', active:true, required:false, description:'กรอกจำนวนแผ่นที่ใช้ก่อนและหลัง'},
        {id:'errors', name:'จำนวนข้อผิดพลาด', unit:'ครั้ง', basis:'ต่องาน 100 รายการ', category:'effectiveness', direction:'decrease', source:'manual', active:true, required:false, description:'กรอกจำนวนข้อผิดพลาดจากจำนวนงานที่กำหนดเท่ากันทั้งสองช่วง'},
        {id:'outcome', name:'อัตรางานที่สำเร็จตามเป้าหมาย', unit:'%', basis:'ต่องานทั้งหมดในช่วงที่ประเมิน', category:'effectiveness', direction:'increase', source:'manual', input:'ratio', active:true, required:true,
            description:'กรอกจำนวนงานสำเร็จตามนิยามและจำนวนงานทั้งหมด ระบบคำนวณร้อยละให้'}
    ];
    const defaults = () => ({kpiSchema:1, before:[], after:[], metrics:standardMetrics()});
    const templates = {
        "SYS001": ["ต่อการค้นหาบุคลากรหนึ่งราย", ["ระบุชื่อหรือหน่วยงาน", "ค้นจากบัญชีรายชื่อที่หน่วยงานรวบรวม", "ตรวจสอบข้อมูลติดต่อกับหน่วยงานต้นสังกัด"], ["ค้นชื่อหรือหน่วยงานในสารบบ", "ตรวจสอบตำแหน่งและข้อมูลติดต่อในผลค้นหา"], "อัตรารายชื่อที่มีข้อมูลติดต่อถูกต้อง", "ต่อรายชื่อที่ตรวจสอบ"],
        "SYS002": ["ต่อคำขอลาหนึ่งรายการ", ["กรอกใบลาและตรวจสอบสิทธิคงเหลือ", "ส่งใบลาให้ผู้มีอำนาจพิจารณา", "บันทึกผลอนุมัติและแจ้งผู้ขอ"], ["ตรวจสอบสิทธิและยื่นคำขอลาออนไลน์", "พิจารณาคำขอในระบบ", "ตรวจสอบผลและยอดวันลาคงเหลือ"], "อัตราคำขอลาที่บันทึกสิทธิและผลอนุมัติถูกต้อง", "ต่อคำขอลาที่ตรวจสอบ"],
        "SYS003": ["ต่อการสรุปเวลาของบุคลากรหนึ่งคนต่อเดือน", ["รวบรวมสมุดลงเวลา", "ตรวจสอบวันขาดรายการและเวลาเข้าออก", "จัดทำรายงานเวลา"], ["เรียกข้อมูลลงเวลารายเดือน", "ตรวจสอบรายการผิดปกติ", "ออกรายงานเวลาจากระบบ"], "อัตรารายการลงเวลาที่ตรงกับหลักฐาน", "ต่อรายการลงเวลาที่ตรวจสอบ"],
        "SYS004": ["ต่อการค้นหาผลงานวิจัยหนึ่งรายการ", ["ขอข้อมูลผลงานจากผู้รับผิดชอบ", "ค้นแฟ้มผลงานแยกตามปี", "ยืนยันข้อมูลอ้างอิงของผลงาน"], ["ค้นผลงานจากฐานข้อมูล", "ตรวจสอบรายละเอียดและหลักฐานอ้างอิง"], "อัตราระเบียนผลงานที่มีข้อมูลอ้างอิงครบ", "ต่อระเบียนที่ตรวจสอบ"],
        "SYS005": ["ต่อการตรวจคุณสมบัติอาจารย์หนึ่งราย", ["รวบรวมประวัติการศึกษาและผลงาน", "เทียบหลักฐานกับเกณฑ์หลักสูตร", "บันทึกผลตรวจและรายการที่ต้องเพิ่มเติม"], ["เปิดประวัติและหลักฐานในระบบ", "ตรวจเทียบเกณฑ์และบันทึกผล"], "อัตราผลตรวจคุณสมบัติที่ตรงกับการทวนสอบ", "ต่อผลตรวจที่ทวนสอบ"],
        "SYS006": ["ต่อการค้นหาแนวปฏิบัติหนึ่งเรื่อง", ["สอบถามเจ้าของเรื่อง", "ค้นเอกสารจากแฟ้มหรือพื้นที่จัดเก็บของหน่วยงาน", "ตรวจสอบฉบับล่าสุด"], ["ค้นหัวข้อในคลังความรู้", "ตรวจสอบฉบับและเปิดเอกสาร"], "อัตราการค้นพบแนวปฏิบัติฉบับล่าสุด", "ต่อการค้นที่ตรวจสอบ"],
        "SYS007": ["ต่อการสรุปภาระงานอาจารย์หนึ่งรายต่อรอบ", ["รวบรวมข้อมูลสอน วิจัย และบริการวิชาการ", "เทียบหลักฐานกับเกณฑ์ภาระงาน", "รวมผลและตรวจยอด"], ["บันทึกภาระงานตามหมวดในระบบ", "ตรวจหลักฐานและยอดที่ระบบสรุป"], "อัตรารายการภาระงานที่จัดหมวดและคำนวณถูกต้อง", "ต่อรายการภาระงานที่ทวนสอบ"],
        "SYS008": ["ต่อการสรุปภาระงานบุคลากรหนึ่งรายต่อรอบ", ["รวบรวมบันทึกงานประจำและงานบริการ", "จำแนกกิจกรรมและตรวจหลักฐาน", "จัดทำสรุปภาระงาน"], ["บันทึกกิจกรรมพร้อมหลักฐานในระบบ", "ตรวจและเรียกสรุปภาระงานรายบุคคล"], "อัตรารายการกิจกรรมที่มีหลักฐานครบ", "ต่อรายการกิจกรรมที่ตรวจสอบ"],
        "SYS009": ["ต่อการอัปเดตโครงการหนึ่งโครงการต่อรอบ", ["ขอความก้าวหน้าจากเจ้าของโครงการ", "รวบรวมผลและงบประมาณในตารางติดตาม", "ตรวจเทียบกับแผนประจำปี"], ["ปรับสถานะโครงการและงบประมาณในระบบ", "ตรวจผลเทียบแผนจากรายงาน"], "อัตราโครงการที่รายงานความก้าวหน้าครบตามรอบ", "ต่อโครงการที่ครบกำหนดรายงาน"],
        "SYS010": ["ต่อการรายงานตัวชี้วัดหนึ่งตัวต่อรอบ", ["รวบรวมผลและหลักฐานจากเจ้าของตัวชี้วัด", "ตรวจนิยามและคำนวณผล", "บันทึกเทียบเป้าหมายในรายงาน"], ["บันทึกผลและหลักฐานตามรอบในระบบ", "ตรวจผลเทียบเป้าหมายกลยุทธ์"], "อัตราตัวชี้วัดที่มีผลและหลักฐานตรวจสอบได้", "ต่อตัวชี้วัดที่ครบกำหนดรายงาน"],
        "SYS011": ["ต่อหนังสือหนึ่งฉบับ", ["ลงทะเบียนหนังสือในสมุดรับส่ง", "ส่งหนังสือให้หน่วยงานปลายทาง", "บันทึกหลักฐานการรับ"], ["ลงทะเบียนและส่งหนังสือในระบบ", "ตรวจสอบการรับจากประวัติการส่ง"], "อัตราหนังสือที่ส่งถึงผู้รับถูกต้องตามกำหนด", "ต่อหนังสือที่ครบกำหนดส่ง"],
        "SYS012": ["ต่อการค้นหาคำสั่งแต่งตั้งหนึ่งรายการ", ["สอบถามผู้ดูแลคำสั่ง", "ค้นแฟ้มคำสั่งตามปีหรือคณะกรรมการ", "ตรวจสอบรายชื่อและวาระ"], ["ค้นคณะกรรมการในระบบ", "ตรวจรายชื่อ วาระ และคำสั่งอ้างอิง"], "อัตรารายชื่อกรรมการที่ตรงกับคำสั่งปัจจุบัน", "ต่อรายชื่อกรรมการที่ตรวจสอบ"],
        "SYS013": ["ต่อข้อเสนอหนึ่งรายการ", ["จัดทำเอกสารข้อเสนอและประมาณการ", "ส่งเอกสารให้ตรวจและปรับแก้", "รวบรวมผลพิจารณา"], ["กรอกข้อเสนอและแนบหลักฐานในระบบ", "ตรวจและบันทึกผลพิจารณา"], "อัตราข้อเสนอที่ผ่านการตรวจความครบถ้วนครั้งแรก", "ต่อข้อเสนอที่ตรวจครั้งแรก"],
        "SYS014": ["ต่อการยื่นแบบฟอร์มหนึ่งฉบับ", ["ขอแบบฟอร์มจากหน่วยงาน", "กรอกข้อมูลและแนบเอกสาร", "ส่งและติดตามการรับเรื่อง"], ["เลือกและกรอกแบบฟอร์มออนไลน์", "ส่งพร้อมหลักฐานและตรวจสถานะ"], "อัตราแบบฟอร์มที่รับเรื่องได้โดยไม่ต้องส่งแก้ไข", "ต่อแบบฟอร์มที่ตรวจครั้งแรก"],
        "SYS015": ["ต่อการหาแบบฟอร์มหนึ่งฉบับ", ["สอบถามหน่วยงานเจ้าของแบบฟอร์ม", "ค้นและตรวจสอบฉบับล่าสุด", "ขอรับสำเนาแบบฟอร์ม"], ["ค้นแบบฟอร์มตามประเภท", "ตรวจฉบับและดาวน์โหลด"], "อัตราการได้รับแบบฟอร์มฉบับปัจจุบัน", "ต่อการขอแบบฟอร์มที่ตรวจสอบ"],
        "SYS016": ["ต่อคำขอจองห้องหนึ่งรายการ", ["สอบถามตารางว่างกับผู้ดูแล", "ส่งรายละเอียดการจอง", "ตรวจเงื่อนไขและยืนยันการใช้ห้อง"], ["ค้นช่วงเวลาว่างและยื่นคำขอ", "ตรวจและยืนยันการจองในระบบ"], "อัตราการจองที่ใช้ห้องได้ตามเวลาที่ได้รับอนุมัติ", "ต่อการจองที่ถึงกำหนดใช้ห้อง"],
        "SYS017": ["ต่อการตรวจสอบครุภัณฑ์หนึ่งรายการ", ["ค้นทะเบียนจากเลขครุภัณฑ์", "ตรวจสถานที่และผู้รับผิดชอบจากหลักฐาน", "ปรับปรุงทะเบียน"], ["ค้นเลขครุภัณฑ์ในระบบ", "ตรวจและปรับปรุงสถานที่หรือผู้รับผิดชอบ"], "อัตราระเบียนครุภัณฑ์ที่ตรงกับการตรวจนับจริง", "ต่อครุภัณฑ์ที่ตรวจนับ"],
        "SYS018": ["ต่อใบแจ้งซ่อมหนึ่งใบ", ["รับแจ้งปัญหาและบันทึกรายละเอียด", "ประสานผู้รับผิดชอบ", "ติดตามและบันทึกผลการซ่อม"], ["เปิดใบแจ้งซ่อมพร้อมรายละเอียด", "มอบหมายและบันทึกการปิดงาน"], "อัตรางานซ่อมที่ปิดภายในกำหนด", "ต่องานซ่อมที่ครบกำหนด"],
        "SYS019": ["ต่อคำขอบริการหนึ่งรายการ", ["รับรายละเอียดและไฟล์จากผู้ขอ", "ประสานกำหนดเผยแพร่", "แจ้งผลพร้อมหลักฐาน"], ["ยื่นคำขอพร้อมสื่อและวันเผยแพร่", "ตรวจคิวและบันทึกผลเผยแพร่"], "อัตรางานประชาสัมพันธ์ที่เผยแพร่ตรงตามกำหนด", "ต่อคำขอที่ครบกำหนดเผยแพร่"],
        "SYS020": ["ต่อการติดตามเงินยืมหนึ่งสัญญา", ["ค้นสัญญาและวันครบกำหนด", "ตรวจหลักฐานส่งใช้เงินยืม", "สรุปยอดคงค้างและแจ้งผู้เกี่ยวข้อง"], ["เปิดรายการเงินยืมในระบบ", "ตรวจยอดและสถานะการส่งใช้", "บันทึกผลติดตาม"], "อัตราสัญญาที่ส่งใช้เงินยืมครบภายในกำหนด", "ต่อสัญญาที่ครบกำหนด"],
        "SYS021": ["ต่อการตรวจสอบเงินบริจาคหนึ่งรายการ", ["รับหลักฐานการบริจาค", "ตรวจยอดกับรายการรับเงิน", "จัดทำหลักฐานรับบริจาค"], ["ตรวจรายการบริจาคอิเล็กทรอนิกส์", "กระทบยอดและตรวจหลักฐานรับบริจาค"], "อัตรารายการบริจาคที่กระทบยอดและมีหลักฐานครบ", "ต่อรายการบริจาคที่ตรวจสอบ"]
    };

    function initialConfig(id) {
        const template = templates[id];
        if (!template) return defaults();
        const [basis, before, after, outcome, outcomeBasis] = template;
        const steps = (names, phase) => names.map((name, index) => ({
            id: `${id}-${phase}-${index + 1}`, name, description: '', active: true, timed: true
        }));
        return {
            ...defaults(),
            before: steps(before, 'before'),
            after: steps(after, 'after'),
            metrics: standardMetrics(basis).map(metric => metric.input === 'ratio'
                ? {...metric, basis:outcomeBasis, definition:outcome}
                : metric)
        };
    }

    function normalizeOutcome(config) {
        if (!Array.isArray(config?.metrics)) return config;
        let changed = false;
        const metrics = config.metrics.map(metric => {
            if (metric.id !== 'outcome' || metric.source !== 'manual' || metric.unit !== '%' || metric.input === 'ratio') return metric;
            changed = true;
            return {...metric, input:'ratio'};
        });
        return changed ? {...config, metrics} : config;
    }

    function rate(success, total) {
        return Number.isSafeInteger(success) && Number.isSafeInteger(total) &&
            success >= 0 && total > 0 && success <= total ? success / total * 100 : null;
    }

    const finite = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
    const periods = {day:'รายวัน', month:'รายเดือน', year:'รายปี', custom:'กำหนดช่วงเวลาเอง'};
    function periodBounds(mode, period) {
        const date = value => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
            const time = Date.parse(value + 'T00:00:00Z');
            return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === value ? time : null;
        };
        const start = period?.start;
        if (mode === 'month' || mode === 'year') {
            const pattern = mode === 'month' ? /^(\d{4})-(0[1-9]|1[0-2])$/ : /^(\d{4})$/;
            const match = pattern.exec(start || '');
            if (!match || Number(match[1]) < 1) return null;
            const index = Number(match[1]) * 12 + (Number(match[2]) || 1) - 1;
            return [index, index + (mode === 'year' ? 11 : 0)];
        }
        if (mode !== 'day' && mode !== 'custom') return null;
        const first = date(start), last = mode === 'day' ? first : date(period?.end);
        return first !== null && last !== null && first <= last ? [first,last] : null;
    }

    function periodIssue(metric, input) {
        if (metric.input !== 'ratio') return '';
        if (!Object.hasOwn(periods, metric.periodMode)) return 'ยังไม่ระบุช่วงเวลาข้อมูล';
        if (input?.status !== 'known') return '';
        const before = periodBounds(metric.periodMode,input.periods?.before);
        const after = periodBounds(metric.periodMode,input.periods?.after);
        if (!before || !after) return 'ช่วงเวลาอ้างอิงไม่ครบหรือไม่ถูกต้อง';
        if (before[1] >= after[0] || before[1]-before[0] !== after[1]-after[0]) {
            return 'ช่วงเวลาก่อนและหลังไม่เทียบเคียงกัน: ช่วงก่อนต้องสิ้นสุดก่อนช่วงหลังและมีระยะเวลาเท่ากัน';
        }
        return '';
    }

    const dataStatuses = {
        known: ['มีข้อมูลก่อนและหลังใช้ระบบ','กรอกข้อมูลทั้งก่อนและหลังใช้ระบบ เพื่อเปรียบเทียบผลการดำเนินงาน'],
        'after-only': ['มีข้อมูลเฉพาะหลังใช้ระบบ','กรอกเฉพาะข้อมูลหลังใช้ระบบ สามารถตรวจสอบการบรรลุเป้าหมายได้ แต่ไม่สามารถเปรียบเทียบก่อน–หลัง'],
        unknown: ['ไม่ทราบข้อมูล','ไม่มีข้อมูลเพียงพอสำหรับตัวชี้วัดนี้ ระบบจะไม่นำไปคำนวณ'],
        na: ['ไม่เกี่ยวข้อง','ตัวชี้วัดนี้ไม่เกี่ยวข้องกับงานหรือระบบที่ประเมิน ระบบจะไม่นำไปคำนวณ']
    };
    function dataPhases(status) {
        return status === 'known' ? ['before','after'] : status === 'after-only' ? ['after'] : [];
    }
    function displayValue(input, phase) {
        return dataPhases(input?.status).includes(phase) && finite(input[phase]) ? input[phase] : null;
    }

    function effectiveness(metric, input) {
        if (metric.category !== 'effectiveness' || metric.source !== 'manual' ||
            !['increase','decrease'].includes(metric.direction) || !finite(metric.target) ||
            !['known','after-only'].includes(input?.status) || !finite(input.after) ||
            (metric.unit === '%' && (metric.target > 100 || input.after > 100))) return null;
        return metric.direction === 'increase' ? input.after >= metric.target : input.after <= metric.target;
    }
    function calculate(metric, input) {
        if (!input || input.status !== 'known' || !finite(input.before) || !finite(input.after)) return { available: false, reason: input?.status === 'na' ? 'ไม่เกี่ยวข้อง' : 'ไม่สามารถคำนวณได้: ไม่มีข้อมูลครบถ้วน' };
        const warning = periodIssue(metric,input);
        if (warning) return {available:false, reason:warning};
        const delta = input.after - input.before;
        const percent = input.before === 0 ? null : delta / input.before * 100;
        let improvement = metric.direction === 'increase' ? delta : -delta;
        if (metric.direction === 'target') {
            if (!finite(metric.target)) return { available: false, reason: 'ยังไม่ได้กำหนดเกณฑ์ประสิทธิผล' };
            improvement = Math.abs(input.before - metric.target) - Math.abs(input.after - metric.target);
        }
        return { available: true, delta, percent, outcome: improvement > 0 ? 'ดีขึ้น' : improvement < 0 ? 'แย่ลง' : 'คงเดิม', targetMet: metric.direction === 'target' ? input.after === metric.target : null };
    }
    const api = {
        keys, clone, defaults, calculate, finite, effectiveness, rate, normalizeOutcome, dataStatuses, dataPhases, displayValue, periods, periodBounds, periodIssue,
        demoConfig() {
            const config = defaults();
            config.metrics = config.metrics.slice(0, 4);
            config.isDemo = true;
            config.before = [
                { id: 'demo-b1', name: 'จัดเตรียมคำขอบนกระดาษ', description: 'กระบวนการตัวอย่างเพื่อทดสอบเท่านั้น', active: true, timed: true },
                { id: 'demo-b2', name: 'ส่งเอกสารให้ผู้รับผิดชอบ', description: '', active: true, timed: true },
                { id: 'demo-b3', name: 'ตรวจสอบและพิจารณาคำขอ', description: '', active: true, timed: true },
                { id: 'demo-b4', name: 'แจ้งผลการดำเนินการ', description: '', active: true, timed: true }
            ];
            config.after = [
                { id: 'demo-a1', name: 'กรอกและส่งคำขอออนไลน์', description: 'กระบวนการตัวอย่างเพื่อทดสอบเท่านั้น', active: true, timed: true },
                { id: 'demo-a2', name: 'ตรวจสอบและอนุมัติผ่านระบบ', description: '', active: true, timed: true },
                { id: 'demo-a3', name: 'รับแจ้งผลผ่านระบบ', description: '', active: true, timed: true }
            ];
            return config;
        },
        systems: () => root.AssessmentCatalog ? root.AssessmentCatalog.getSystems() : [],
        config(id) {
            const saved = read(keys.config, {})[id];
            const initial = initialConfig(id);
            return clone(normalizeOutcome(saved || initial));
        },
        saveConfig(id, value) {
            const configs = read(keys.config, {});
            const saved = clone(value);
            delete saved.version;
            delete saved.release;
            saved.kpiSchema = 1;
            configs[id] = saved;
            localStorage.setItem(keys.config, JSON.stringify(configs));
            return saved;
        },
        draft: () => read(keys.draft, null),
        saveDraft: value => localStorage.setItem(keys.draft, JSON.stringify(value)),
        records: () => read(keys.records, []),
        submit(record) {
            const records = api.records();
            if (!records.some(r => r.id === record.id)) {
                records.push(clone(record));
                localStorage.setItem(keys.records, JSON.stringify(records));
            }
            localStorage.removeItem(keys.draft);
        }
    };
    root.Quantitative = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
