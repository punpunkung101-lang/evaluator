(() => {
    if (document.body.dataset.quantPage === 'admin') {
        const back = document.getElementById('q-admin-dashboard-back');
        if (!back) return;
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
})();
