(() => {
    const script = document.currentScript;
    const base = new URL('../../', script.src);
    if (!document.querySelector('link[data-quant-style]')) {
        const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('assets/css/quantitative.css', base); css.dataset.quantStyle = ''; document.head.append(css);
    }
    const sidebar = document.createElement('aside'); sidebar.className = 'it-sidebar';
    const admin = ['admin', 'dashboard'].includes(document.body.dataset.quantPage);
    const links = [['index.html', 'หน้าแรก / ภาพรวม'], ['evaluation.html', 'ประเมินประสิทธิภาพและประสิทธิผล'], ['../../Satisfaction_Survey/user/index.html', 'ประเมินความพึงพอใจ']];
    if (admin) links.push(['dashboard.html', 'Admin Dashboard เชิงปริมาณ'], ['admin.html', 'จัดการกระบวนการและตัวชี้วัด'], ['../../Satisfaction_Survey/admin/dashboard.html', 'Dashboard ความพึงพอใจ']);
    sidebar.innerHTML = '<strong>IT Evaluator</strong><nav aria-label="เมนูหลัก"></nav>';
    links.forEach(([path, label]) => {
        const a = document.createElement('a'); a.href = new URL(path, base); a.textContent = label;
        const active = location.pathname === new URL(a.href).pathname || (path.includes('Satisfaction_Survey/user') && location.pathname.includes('/Satisfaction_Survey/user/'));
        if (active) { a.classList.add('active'); a.setAttribute('aria-current', 'page'); }
        sidebar.querySelector('nav').append(a);
    });
    document.body.prepend(sidebar); document.body.classList.add('it-has-sidebar');
})();
