(() => {
    if (document.body.dataset.quantPage === 'admin') {
        const back = document.getElementById('q-admin-dashboard-back');
        function updateLabel() {
            let language = document.documentElement.lang;
            try { language = localStorage.getItem('it_eval_lang') || language; } catch { /* Use the page language. */ }
            back.lastElementChild.textContent = language === 'en' ? 'Back' : 'ย้อนกลับ';
        }
        updateLabel();
        document.addEventListener('langchange', updateLabel);
        window.addEventListener('storage', event => {
            if (event.key === 'it_eval_lang' || event.key === null) updateLabel();
        });
        return;
    }
    const script = document.currentScript;
    const base = new URL('../../', script.src);
    if (!document.querySelector('link[data-quant-style]')) {
        const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('assets/css/quantitative.css', base); css.dataset.quantStyle = ''; document.head.append(css);
    }
    const sidebar = document.createElement('aside'); sidebar.className = 'it-sidebar';
    const admin = document.body.dataset.quantPage === 'dashboard';
    const links = [['index.html', 'หน้าแรก / ภาพรวม'], ['evaluation.html', 'ประเมินประสิทธิภาพและประสิทธิผล'], ['../../Satisfaction_Survey/user/index.html', 'ประเมินความพึงพอใจ']];
    if (admin) links.push(['../../Satisfaction_Survey/admin/dashboard.html#quantitative-results', 'Admin Dashboard เชิงปริมาณ'], ['admin.html', 'จัดการกระบวนการและตัวชี้วัด'], ['../../Satisfaction_Survey/admin/dashboard.html', 'Dashboard ความพึงพอใจ']);
    sidebar.innerHTML = '<strong>IT Evaluator</strong><nav aria-label="เมนูหลัก"></nav>';
    if (document.body.classList.contains('survey-sidebar-style')) {
        sidebar.classList.add('ev-sidebar');
        sidebar.firstElementChild.outerHTML = '<div class="ev-sidebar-brand"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM8 16v-4m4 4V8m4 8v-6"/></svg><strong>IT Evaluator</strong></div>';
    }
    const englishLabels = ['Home / Overview', 'Efficiency & Effectiveness Evaluation', 'Satisfaction Evaluation'];
    links.forEach(([path, label], index) => {
        const a = document.createElement('a'); a.href = new URL(path, base); a.textContent = label;
        const active = location.pathname === new URL(a.href).pathname || (path.includes('Satisfaction_Survey/user') && location.pathname.includes('/Satisfaction_Survey/user/'));
        if (active) { a.setAttribute('aria-current', 'page'); a.classList.add('active'); }
        if (englishLabels[index]) {
            const updateLabel = () => {
                a.textContent = document.documentElement.lang === 'en' ? englishLabels[index] : label;
            };
            updateLabel();
            document.addEventListener('langchange', updateLabel);
        }
        sidebar.querySelector('nav').append(a);
    });
    const surveyHeader = document.querySelector('.ev-survey-header');
    if (surveyHeader) surveyHeader.after(sidebar);
    else document.body.prepend(sidebar);
    document.body.classList.add('it-has-sidebar');
})();
