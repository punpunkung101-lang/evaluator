(function (root) {
  'use strict';

  function render({ container, systems, type, onSelect, onTypeChange }) {
    const rows = Array.isArray(systems) ? systems : [];
    container.innerHTML = `<section class="system-picker" aria-labelledby="system-picker-title">
      <div class="picker-heading"><div><h2 id="system-picker-title">เลือกระบบที่ต้องการประเมิน</h2><p>ค้นหาจากรหัสหรือชื่อระบบ แล้วเลือกเพื่อเริ่มแบบประเมิน</p></div>
      <label class="picker-search">ค้นหาระบบ<input id="system-search" type="search" autocomplete="off" placeholder="เช่น SYS018 หรือ ระบบแจ้งซ่อม" aria-controls="system-list"></label></div>
      <div class="picker-types" role="group" aria-label="ชนิดแบบประเมิน">
        <button type="button" data-assessment-type="effectiveness" class="${type === 'effectiveness' ? 'is-current' : ''}" ${type === 'effectiveness' ? 'aria-current="true"' : ''}>ประสิทธิผล</button>
        <button type="button" data-assessment-type="satisfaction" class="${type === 'satisfaction' ? 'is-current' : ''}" ${type === 'satisfaction' ? 'aria-current="true"' : ''}>ความพึงพอใจ</button>
      </div>
      <p class="picker-count" id="system-count" aria-live="polite"></p>
      <div class="system-picker-grid" id="system-list"></div>
    </section>`;
    const list = container.querySelector('#system-list');
    const search = container.querySelector('#system-search');
    const count = container.querySelector('#system-count');
    const draw = () => {
      const query = search.value.trim().toLocaleLowerCase();
      const visible = rows.filter((item) => `${item.id} ${item.name} ${item.name_en || ''}`.toLocaleLowerCase().includes(query));
      count.textContent = rows.length ? `แสดง ${visible.length} จาก ${rows.length} ระบบ` : 'ไม่พบข้อมูลระบบที่เปิดใช้งาน';
      list.innerHTML = visible.length ? visible.map((item) => `<button type="button" class="system-picker-card" data-system-id="${escapeAttr(item.id)}"><span class="system-picker-id">${escapeHtml(item.id)}</span><strong>${escapeHtml(item.name)}</strong><span class="system-picker-action">เลือกระบบนี้</span></button>`).join('') : '<p class="picker-empty" role="status">ไม่พบระบบที่ตรงกับคำค้น ลองค้นด้วยรหัส SYS001–SYS021 หรือชื่อระบบ</p>';
      list.querySelectorAll('[data-system-id]').forEach((button) => button.addEventListener('click', () => {
        const selected = rows.find((item) => item.id === button.dataset.systemId);
        if (selected) onSelect(selected);
      }));
    };
    search.addEventListener('input', draw);
    container.querySelectorAll('[data-assessment-type]').forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.assessmentType !== type) onTypeChange(button.dataset.assessmentType);
    }));
    draw();
  }

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  const escapeAttr = escapeHtml;
  root.AssessmentSystemPicker = Object.freeze({ render });
})(window);
