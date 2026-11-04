(() => {
    'use strict';
    const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function markup(labels, current) {
        return `<nav id="energy-stepper" class="energy-stepper rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="ขั้นตอนการประเมิน"><p class="energy-counter text-sm font-medium text-slate-500" role="status">ขั้นที่ ${current + 1} จาก ${labels.length}</p><div class="energy-track" aria-hidden="true"><span class="energy-fill" style="--energy-progress:${current / (labels.length - 1)}"></span></div><ol class="energy-steps grid grid-cols-5 gap-1">${labels.map((label, i) => `<li class="energy-step ${i < current ? 'is-complete' : i === current ? 'is-active' : 'is-pending'}" ${i === current ? 'aria-current="step"' : ''}><span class="energy-circle" aria-hidden="true">${i + 1}</span><span class="energy-label">${escape(label)}</span><span class="energy-state">${i < current ? 'เสร็จแล้ว' : i === current ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}</span></li>`).join('')}</ol></nav>`;
    }
    function update(element, current, labels) {
        element.querySelector('.energy-fill').style.setProperty('--energy-progress', current / (labels.length - 1));
        element.querySelector('.energy-counter').textContent = `ขั้นที่ ${current + 1} จาก ${labels.length}`;
        element.querySelectorAll('.energy-step').forEach((item, i) => {
            item.classList.toggle('is-complete', i < current);
            item.classList.toggle('is-active', i === current);
            item.classList.toggle('is-pending', i > current);
            if (i === current) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
            item.querySelector('.energy-state').textContent = i < current ? 'เสร็จแล้ว' : i === current ? 'กำลังดำเนินการ' : 'รอดำเนินการ';
        });
    }
    window.EnergyStepper = { markup, update };
})();
