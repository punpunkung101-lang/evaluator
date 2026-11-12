const scriptUrl = document.currentScript?.src;
const runtimeUrl = path => window.EvaluatorRuntimeUrl.fromScript(path, scriptUrl);
let systemCatalog = [];
const copy = { th: { title:'ประเมินประสิทธิผลระบบ IT | คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร', utility:'ศูนย์ประเมินระบบสารสนเทศ', contact:'ติดต่อเรา', faculty:'คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร', facultyEnglish:'Faculty of Allied Health Sciences, Naresuan University', theme:'โหมดมืด', login:'เข้าสู่ระบบ', home:'หน้าหลัก', about:'เกี่ยวกับ', aboutEffectiveness:'ประเมินประสิทธิผลระบบ IT', aboutSatisfaction:'ประเมินความพึงพอใจ', systems:'ประสิทธิผลระบบ', satisfaction:'ประเมินความพึงพอใจ', takeSurvey:'ทำแบบประเมินความพึงพอใจ', surveyDashboard:'แดชบอร์ดผู้ดูแล', eyebrow:'AHS IT EVALUATION', heroTitle:'ศูนย์ประเมินระบบสารสนเทศ', heroDescription:'ร่วมพัฒนาระบบสารสนเทศให้ตอบโจทย์การเรียนรู้ การทำงาน และการบริการของคณะสหเวชศาสตร์', explore:'เลือกบริการประเมิน', serviceLabel:'AHS SERVICES', serviceTitle:'การเรียนรู้ตลอดชีพ', serviceIntro:'เลือกแบบประเมินที่ต้องการ เพื่อร่วมสะท้อนผลและยกระดับบริการดิจิทัลของคณะฯ', effectivenessTitle:'ประเมินประสิทธิผลระบบ IT', effectivenessDescription:'เลือกระบบแล้วประเมินการเปลี่ยนแปลงของกระบวนการก่อนและหลังใช้ระบบ', startEffectiveness:'เลือกระบบเพื่อเริ่มประเมิน', satisfactionTitle:'ประเมินความพึงพอใจ', satisfactionDescription:'เลือกระบบแล้วแบ่งปันความรู้สึกต่อการใช้งานระบบนั้น', startSatisfaction:'เลือกระบบเพื่อเริ่มประเมิน', footer:'คณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร', contactTitle:'ศูนย์เทคโนโลยีสารสนเทศ', contactText:'หากต้องการความช่วยเหลือเกี่ยวกับการประเมิน โปรดติดต่อผู้ดูแลระบบของคณะสหเวชศาสตร์', loginTitle:'เข้าสู่ระบบผู้ดูแล', username:'ชื่อผู้ใช้', password:'รหัสผ่าน', signIn:'เข้าสู่ระบบ', skip:'ข้ามไปยังเนื้อหาหลัก', selected:'เลือกระบบ {system} แล้ว — หน้าประเมินกำลังอยู่ระหว่างการจัดเตรียม', loginMessage:'หน้าเข้าสู่ระบบจะเชื่อมต่อเมื่อบริการยืนยันตัวตนพร้อมใช้งาน' }, en: { title:'IT Effectiveness Evaluation | Faculty of Allied Health Sciences, Naresuan University', utility:'Information Systems Evaluation Centre', contact:'Contact us', faculty:'Faculty of Allied Health Sciences, Naresuan University', facultyEnglish:'Naresuan University', theme:'Dark mode', login:'Login', home:'Home', about:'About', aboutEffectiveness:'IT effectiveness evaluation', aboutSatisfaction:'Satisfaction evaluation', systems:'System effectiveness', satisfaction:'Satisfaction evaluation', takeSurvey:'Take satisfaction survey', surveyDashboard:'Administrator dashboard', eyebrow:'AHS IT EVALUATION', heroTitle:'Information Systems Evaluation Centre', heroDescription:'Help develop information systems that support learning, work, and services at the Faculty of Allied Health Sciences.', explore:'Choose an evaluation', serviceLabel:'AHS SERVICES', serviceTitle:'Lifelong Learning', serviceIntro:'Choose an evaluation to share your perspective and improve the faculty’s digital services.', effectivenessTitle:'IT System Effectiveness Evaluation', effectivenessDescription:'Choose a system and compare its work process before and after using IT.', startEffectiveness:'Choose a system to begin', satisfactionTitle:'Satisfaction Evaluation', satisfactionDescription:'Choose a system and share how satisfied you are with using it.', startSatisfaction:'Choose a system to begin', footer:'Faculty of Allied Health Sciences, Naresuan University', contactTitle:'Information Technology Centre', contactText:'For assistance with an evaluation, please contact the Faculty of Allied Health Sciences system administrator.', loginTitle:'Administrator login', username:'Username', password:'Password', signIn:'Sign in', skip:'Skip to main content', selected:'{system} selected — its evaluation page is being prepared.', loginMessage:'Login will be connected when the authentication service is available.' } };
Object.assign(copy.th, { loginIntro:'กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งานระบบประเมิน', usernameLabel:'ชื่อผู้ใช้หรือ ID 8 หลัก', usernamePlaceholder:'กรอกชื่อผู้ใช้หรือ ID', displayNameLabel:'ชื่อที่ใช้แสดง (ไม่เกิน 20 ตัวอักษร)', displayNamePlaceholder:'กรอกชื่อที่ใช้แสดง', generatedIdLabel:'ID ผู้ใช้ 8 หลัก (ระบบกำหนดให้อัตโนมัติ)', roleLabel:'ประเภทผู้ใช้งาน', roleStudent:'นิสิต', roleTeacher:'อาจารย์ / นักวิจัย', roleStaff:'บุคลากรสายสนับสนุน', passwordPlaceholder:'กรอกรหัสผ่าน', showPassword:'แสดงรหัสผ่าน', hidePassword:'ซ่อนรหัสผ่าน', createAccountTitle:'สร้างบัญชีผู้ใช้งาน', createAccountIntro:'สร้างบัญชีเพื่อใช้เข้าสู่ระบบประเมินทั้งสองประเภท', createAccount:'สร้างบัญชี', existingAccount:'มีบัญชีแล้ว? เข้าสู่ระบบ', newAccount:'สร้างบัญชีใหม่', requiredError:'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', passwordLengthError:'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', connecting:'กำลังเชื่อมต่อฐานข้อมูล...', signedIn:'เข้าสู่ระบบแล้ว: {name}', signInError:'เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบชื่อผู้ใช้และรหัสผ่าน' });
Object.assign(copy.en, { loginIntro:'Enter your username and password to access the evaluation system.', usernameLabel:'Username or 8-digit ID', usernamePlaceholder:'Enter username or ID', displayNameLabel:'Display name (up to 20 characters)', displayNamePlaceholder:'Enter a display name', generatedIdLabel:'8-digit user ID (assigned automatically)', roleLabel:'User role', roleStudent:'Student', roleTeacher:'Teacher / Researcher', roleStaff:'Support staff', passwordPlaceholder:'Enter password', showPassword:'Show password', hidePassword:'Hide password', createAccountTitle:'Create an account', createAccountIntro:'Create an account to use both evaluation systems.', createAccount:'Create account', existingAccount:'Already have an account? Sign in', newAccount:'Create a new account', requiredError:'Please complete all required fields.', passwordLengthError:'Password must be at least 8 characters.', connecting:'Connecting to the database…', signedIn:'Signed in: {name}', signInError:'Sign-in failed. Check your username and password.' });
let language = localStorage.getItem('it_eval_lang') || 'th';
const $ = (selector, parent = document) => parent.querySelector(selector);
function applyLanguage() { const text = copy[language]; document.documentElement.lang = language; document.title = text.title; document.querySelectorAll('[data-i18n]').forEach(element => { if (element.closest('[data-site-header]')) return; const value = text[element.dataset.i18n]; if (value !== undefined) element.textContent = value; }); document.querySelectorAll('[data-i18n-placeholder]').forEach(element => { const value = text[element.dataset.i18nPlaceholder]; if (value !== undefined) element.placeholder = value; }); if ($('#login-dialog')) syncLoginMode(); showSelectedSystem(); }
function showSelectedSystem() { const id = new URLSearchParams(location.search).get('system'); const target = $('#selected-system'); if (!id) { target.textContent = ''; return; } const item = systemCatalog.find(system => system.id === id); if (item) target.textContent = copy[language].selected.replace('{system}', `${item.id} - ${language === 'th' ? item.name : item.name_en}`); }
document.querySelectorAll('[data-open-dialog]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.openDialog}`).showModal()));
document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
let createAccount = false;
function syncLoginMode() {
    const text = copy[language];
    $('#account-title').textContent = createAccount ? text.createAccountTitle : text.loginTitle;
    $('.login-intro').textContent = createAccount ? text.createAccountIntro : text.loginIntro;
    $('#account-submit').textContent = createAccount ? text.createAccount : text.signIn;
    $('#account-mode').textContent = createAccount ? text.existingAccount : text.newAccount;
    $('#password-visibility').setAttribute('aria-label', text.showPassword);
}
$('#account-mode').addEventListener('click', () => {
    createAccount = !createAccount;
    syncLoginMode();
    $('#display-name-wrap').hidden = !createAccount;
    $('#account-role-wrap').hidden = !createAccount;
    $('#account-id-wrap').hidden = !createAccount;
    $('#account-password').autocomplete = createAccount ? 'new-password' : 'current-password';
    $('#account-password').type = 'password';
    $('#password-visibility').setAttribute('aria-pressed', 'false');
    $('#password-visibility').setAttribute('aria-label', copy[language].showPassword);
    $('#login-validation').textContent = '';
    $('#login-note').textContent = '';
});
$('#password-visibility').addEventListener('click', () => {
    const password = $('#account-password');
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    $('#password-visibility').setAttribute('aria-pressed', String(visible));
    $('#password-visibility').setAttribute('aria-label', copy[language][visible ? 'hidePassword' : 'showPassword']);
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
        validation.textContent = copy[language].requiredError;
        if (!username) $('#account-username').setAttribute('aria-invalid', 'true');
        if (!password) $('#account-password').setAttribute('aria-invalid', 'true');
        if (createAccount && !displayName) $('#account-display-name').setAttribute('aria-invalid', 'true');
        $('#login-form [aria-invalid="true"]')?.focus();
        return;
    }
    if (createAccount && password.length < 8) {
        validation.textContent = copy[language].passwordLengthError;
        $('#account-password').setAttribute('aria-invalid', 'true');
        $('#account-password').focus();
        return;
    }
    $('#account-submit').disabled = true;
    note.textContent = copy[language].connecting;
    try {
        const user = createAccount
            ? await window.EvaluatorAuth.register(username, password, displayName, $('#account-role').value)
            : await window.EvaluatorAuth.login(username, password);
        window.EvaluatorAuth.saveSession(user);
        if (createAccount) $('#account-id').value = user.id;
        await window.EvaluatorAuth.renderAuthButton(user);
        note.textContent = copy[language].signedIn.replace('{name}', user.displayName);
        const returnTo = new URLSearchParams(location.search).get('returnTo');
        window.setTimeout(() => {
            const appRoot = new URL(runtimeUrl('../../../'));
            const returnUrl = returnTo ? new URL(returnTo, location.origin) : null;
            if (returnUrl && returnUrl.origin === appRoot.origin && returnUrl.pathname.startsWith(appRoot.pathname)) location.assign(returnUrl.href);
            else $('#login-dialog').close();
        }, 450);
    } catch (error) {
        note.textContent = language === 'en' && error.message ? error.message : error.message || copy[language].signInError;
    } finally {
        $('#account-submit').disabled = false;
    }
});
document.addEventListener('langchange', event => { language = event.detail?.lang === 'en' ? 'en' : 'th'; applyLanguage(); });
if (localStorage.getItem('it_eval_theme') === 'dark') { document.body.classList.add('dark'); $('#theme-toggle').setAttribute('aria-pressed', 'true'); $('.control-icon').textContent = '☀'; }
$('#year').textContent = new Date().getFullYear(); applyLanguage();
window.EvaluationAPI?.getSystems().then(rows => { systemCatalog = rows; showSelectedSystem(); }).catch(error => { $('#selected-system').textContent = `โหลดรายชื่อระบบไม่สำเร็จ: ${error.message}`; });
if (new URLSearchParams(location.search).get('login') === '1') $('#login-dialog').showModal();
