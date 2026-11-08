const systems = [
  ['SYS001', 'รายชื่อบุคลากร', 'Personnel Directory'], ['SYS002', 'ระบบลาออนไลน์', 'Online Leave System'], ['SYS003', 'ลงเวลาปฏิบัติงาน', 'Time Attendance'], ['SYS004', 'ฐานข้อมูลงานวิจัย', 'Research Database'], ['SYS005', 'คุณสมบัติอาจารย์ผู้รับผิดชอบหลักสูตร', 'Programme Director Qualifications'], ['SYS006', 'AHS KM Hub', 'AHS KM Hub'], ['SYS007', 'ภาระงานสายวิชาการ', 'Academic Workload'], ['SYS008', 'ภาระงานสายสนับสนุน', 'Support Staff Workload'], ['SYS009', 'แผนปฏิบัติการประจำปี', 'Annual Action Plan'], ['SYS010', 'ระบบ KPI / แผนกลยุทธ์', 'KPI / Strategic Plan'], ['SYS011', 'ระบบรับส่งหนังสือ', 'Document Dispatch System'], ['SYS012', 'กรรมการภายในต่างๆ', 'Internal Committees'], ['SYS013', 'ระบบเสนอของบอิเล็กทรอนิกส์', 'Electronic Budget Proposal'], ['SYS014', 'AHS eForm', 'AHS eForm'], ['SYS015', 'ดาวน์โหลดแบบฟอร์ม', 'Form Downloads'], ['SYS016', 'ระบบบริหารจัดการอาคารและห้อง', 'Building and Room Management'], ['SYS017', 'ระบบบริหารจัดการครุภัณฑ์', 'Asset Management'], ['SYS018', 'ระบบซ่อมและบำรุงรักษา', 'Repair and Maintenance'], ['SYS019', 'ระบบขอรับบริการจากหน่วยประชาสัมพันธ์', 'Public Relations Service Request'], ['SYS020', 'ระบบลูกหนี้เงินยืม', 'Advance Debtor System'], ['SYS021', 'ระบบ AHS e-donation', 'AHS e-donation']
];
const copy = { th: { title:'ประเมินประสิทธิผลระบบ IT | คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร', utility:'ศูนย์ประเมินระบบสารสนเทศ', contact:'ติดต่อเรา', faculty:'คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร', facultyEnglish:'Faculty of Allied Health Sciences, Naresuan University', theme:'โหมดมืด', login:'เข้าสู่ระบบ', home:'หน้าหลัก', about:'เกี่ยวกับ', aboutEffectiveness:'ประเมินประสิทธิผลระบบ IT', aboutSatisfaction:'ประเมินความพึงพอใจ', systems:'ประสิทธิผลระบบ', satisfaction:'ประเมินความพึงพอใจ', takeSurvey:'ทำแบบประเมินความพึงพอใจ', surveyDashboard:'แดชบอร์ดผู้ดูแล', eyebrow:'AHS IT EVALUATION', heroTitle:'ศูนย์ประเมินระบบสารสนเทศ', heroDescription:'ร่วมพัฒนาระบบสารสนเทศให้ตอบโจทย์การเรียนรู้ การทำงาน และการบริการของคณะสหเวชศาสตร์', explore:'เลือกบริการประเมิน', serviceLabel:'AHS SERVICES', serviceTitle:'การเรียนรู้ตลอดชีพ', serviceIntro:'เลือกแบบประเมินที่ต้องการ เพื่อร่วมสะท้อนผลและยกระดับบริการดิจิทัลของคณะฯ', effectivenessTitle:'ประเมินประสิทธิผลระบบ IT', effectivenessDescription:'ประเมินผลการใช้งาน ความเหมาะสม และประโยชน์ของระบบสารสนเทศในคณะฯ', startEffectiveness:'เลือกระบบเพื่อเริ่มประเมิน', satisfactionTitle:'ประเมินความพึงพอใจ', satisfactionDescription:'แบ่งปันประสบการณ์การใช้งาน เพื่อพัฒนาการบริการให้ดียิ่งขึ้น', startSatisfaction:'เริ่มทำแบบประเมิน', footer:'คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร', contactTitle:'ศูนย์เทคโนโลยีสารสนเทศ', contactText:'หากต้องการความช่วยเหลือเกี่ยวกับการประเมิน โปรดติดต่อผู้ดูแลระบบของคณะสหเวชศาสตร์', loginTitle:'เข้าสู่ระบบผู้ดูแล', username:'ชื่อผู้ใช้', password:'รหัสผ่าน', signIn:'เข้าสู่ระบบ', skip:'ข้ามไปยังเนื้อหาหลัก', selected:'เลือกระบบ {system} แล้ว — หน้าประเมินกำลังอยู่ระหว่างการจัดเตรียม', loginMessage:'หน้าเข้าสู่ระบบจะเชื่อมต่อเมื่อบริการยืนยันตัวตนพร้อมใช้งาน' }, en: { title:'IT Effectiveness Evaluation | Faculty of Allied Health Sciences, Naresuan University', utility:'Information Systems Evaluation Centre', contact:'Contact us', faculty:'Faculty of Allied Health Sciences, Naresuan University', facultyEnglish:'Naresuan University', theme:'Dark mode', login:'Login', home:'Home', about:'About', aboutEffectiveness:'IT effectiveness evaluation', aboutSatisfaction:'Satisfaction evaluation', systems:'System effectiveness', satisfaction:'Satisfaction evaluation', takeSurvey:'Take satisfaction survey', surveyDashboard:'Administrator dashboard', eyebrow:'AHS IT EVALUATION', heroTitle:'Information Systems Evaluation Centre', heroDescription:'Help develop information systems that support learning, work, and services at the Faculty of Allied Health Sciences.', explore:'Choose an evaluation', serviceLabel:'AHS SERVICES', serviceTitle:'Lifelong Learning', serviceIntro:'Choose an evaluation to share your perspective and improve the faculty’s digital services.', effectivenessTitle:'IT System Effectiveness Evaluation', effectivenessDescription:'Evaluate system use, suitability, and value across the faculty.', startEffectiveness:'Choose a system to begin', satisfactionTitle:'Satisfaction Evaluation', satisfactionDescription:'Share your experience to help us improve our services.', startSatisfaction:'Start the survey', footer:'Faculty of Allied Health Sciences, Naresuan University', contactTitle:'Information Technology Centre', contactText:'For assistance with an evaluation, please contact the Faculty of Allied Health Sciences system administrator.', loginTitle:'Administrator login', username:'Username', password:'Password', signIn:'Sign in', skip:'Skip to main content', selected:'{system} selected — its evaluation page is being prepared.', loginMessage:'Login will be connected when the authentication service is available.' } };
let language = localStorage.getItem('it_eval_lang') || 'th';
const $ = (selector, parent = document) => parent.querySelector(selector);
function renderSystems() { const menu = $('#systems-menu'); menu.innerHTML = systems.map(([id, th, en]) => `<a href="evaluation.html?system=${id}" data-system="${id}">${id} - ${language === 'th' ? th : en}</a>`).join(''); }
function applyLanguage() { const text = copy[language]; document.documentElement.lang = language; document.title = text.title; document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = text[element.dataset.i18n]; }); $('#language-toggle').textContent = language === 'th' ? 'TH / EN' : 'EN / TH'; renderSystems(); showSelectedSystem(); }
function showSelectedSystem() { const id = new URLSearchParams(location.search).get('system'); const target = $('#selected-system'); if (!id) { target.textContent = ''; return; } const item = systems.find(system => system[0] === id); if (item) target.textContent = copy[language].selected.replace('{system}', `${item[0]} - ${language === 'th' ? item[1] : item[2]}`); }
function closeDropdowns(except) { document.querySelectorAll('.nav-dropdown.open').forEach(item => { if (item !== except) { item.classList.remove('open'); $('button', item).setAttribute('aria-expanded', 'false'); } }); }
document.querySelectorAll('.dropdown-toggle').forEach(button => button.addEventListener('click', () => { const parent = button.parentElement; const opening = !parent.classList.contains('open'); closeDropdowns(parent); parent.classList.toggle('open', opening); button.setAttribute('aria-expanded', String(opening)); }));
document.addEventListener('click', event => { if (!event.target.closest('.nav-dropdown')) closeDropdowns(); });
$('#menu-toggle').addEventListener('click', () => { const nav = $('#primary-nav'); const isOpen = nav.classList.toggle('open'); $('#menu-toggle').setAttribute('aria-expanded', String(isOpen)); });
$('#theme-toggle').addEventListener('click', () => { const dark = document.body.classList.toggle('dark'); localStorage.setItem('it_eval_theme', dark ? 'dark' : 'light'); $('#theme-toggle').setAttribute('aria-pressed', String(dark)); $('.control-icon').textContent = dark ? '☀' : '☾'; });
$('#language-toggle').addEventListener('click', () => { language = language === 'th' ? 'en' : 'th'; localStorage.setItem('it_eval_lang', language); applyLanguage(); });
document.querySelectorAll('[data-open-dialog]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.openDialog}`).showModal()));
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
let createAccount = false;
$('#account-mode').addEventListener('click', () => {
    createAccount = !createAccount;
    $('#account-title').textContent = createAccount ? 'สร้างบัญชีผู้ใช้งาน' : 'เข้าสู่ระบบ';
    $('.login-intro').textContent = createAccount ? 'สร้างบัญชีเพื่อใช้เข้าสู่ระบบประเมินทั้งสองประเภท' : 'กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งานระบบประเมิน';
    $('#account-submit').textContent = createAccount ? 'สร้างบัญชี' : 'เข้าสู่ระบบ';
    $('#account-mode').textContent = createAccount ? 'มีบัญชีแล้ว? เข้าสู่ระบบ' : 'สร้างบัญชีใหม่';
    $('#display-name-wrap').hidden = !createAccount;
    $('#account-role-wrap').hidden = !createAccount;
    $('#account-id-wrap').hidden = !createAccount;
    $('#account-password').autocomplete = createAccount ? 'new-password' : 'current-password';
    $('#account-password').type = 'password';
    $('#password-visibility').setAttribute('aria-pressed', 'false');
    $('#password-visibility').setAttribute('aria-label', 'แสดงรหัสผ่าน');
    $('#login-validation').textContent = '';
    $('#login-note').textContent = '';
});
$('#password-visibility').addEventListener('click', () => {
    const password = $('#account-password');
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    $('#password-visibility').setAttribute('aria-pressed', String(visible));
    $('#password-visibility').setAttribute('aria-label', visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
});
$('#login-form').addEventListener('input', () => {
    $('#login-validation').textContent = '';
    $('#account-username').removeAttribute('aria-invalid');
    $('#account-password').removeAttribute('aria-invalid');
    $('#account-display-name').removeAttribute('aria-invalid');
});
$('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const note = $('#login-note');
    const validation = $('#login-validation');
    const username = $('#account-username').value.trim();
    const password = $('#account-password').value;
    const displayName = $('#account-display-name').value.trim();
    $('#account-username').removeAttribute('aria-invalid');
    $('#account-password').removeAttribute('aria-invalid');
    validation.textContent = '';
    if (!username || !password || (createAccount && !displayName)) {
        validation.textContent = 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน';
        if (!username) $('#account-username').setAttribute('aria-invalid', 'true');
        if (!password) $('#account-password').setAttribute('aria-invalid', 'true');
        if (createAccount && !displayName) $('#account-display-name').setAttribute('aria-invalid', 'true');
        $('#login-form [aria-invalid="true"]')?.focus();
        return;
    }
    if (createAccount && password.length < 8) {
        validation.textContent = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
        $('#account-password').setAttribute('aria-invalid', 'true');
        $('#account-password').focus();
        return;
    }
    $('#account-submit').disabled = true;
    note.textContent = 'กำลังเชื่อมต่อฐานข้อมูล...';
    try {
        const user = createAccount
            ? await window.EvaluatorAuth.register(username, password, displayName, $('#account-role').value)
            : await window.EvaluatorAuth.login(username, password);
        window.EvaluatorAuth.saveSession(user);
        if (createAccount) $('#account-id').value = user.id;
        await window.EvaluatorAuth.renderAuthButton(user);
        note.textContent = `เข้าสู่ระบบแล้ว: ${user.displayName}`;
        const returnTo = new URLSearchParams(location.search).get('returnTo');
        window.setTimeout(() => {
            if (returnTo && returnTo.startsWith('/frontend/')) location.assign(returnTo);
            else $('#login-dialog').close();
        }, 450);
    } catch (error) {
        note.textContent = error.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน';
    } finally {
        $('#account-submit').disabled = false;
    }
});
if (localStorage.getItem('it_eval_theme') === 'dark') { document.body.classList.add('dark'); $('#theme-toggle').setAttribute('aria-pressed', 'true'); $('.control-icon').textContent = '☀'; }
$('#year').textContent = new Date().getFullYear(); applyLanguage();
window.EvaluatorAuth.renderAuthButton();
if (new URLSearchParams(location.search).get('login') === '1') $('#login-dialog').showModal();
