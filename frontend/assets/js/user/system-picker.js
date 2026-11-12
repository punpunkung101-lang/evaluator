(function (root) {
  'use strict';

  function render({ container, systems, type, onSelect, onTypeChange }) {
    const rows = Array.isArray(systems) ? systems : [];
    container.innerHTML = `<section class="system-picker" aria-labelledby="system-picker-title">
      <div class="picker-heading"><div><h2 id="system-picker-title" data-i18n="assessment_picker_title">เลือกระบบที่ต้องการประเมิน</h2><p data-i18n="assessment_picker_intro">ค้นหาจากรหัสหรือชื่อระบบ แล้วเลือกเพื่อเริ่มแบบประเมิน</p></div>
      <label class="picker-search"><span data-i18n="assessment_picker_search">ค้นหาระบบ</span><input id="system-search" type="search" autocomplete="off" placeholder="เช่น SYS018 หรือ ระบบแจ้งซ่อม" data-i18n-placeholder="assessment_picker_placeholder" aria-controls="system-list"></label></div>
      <div class="picker-types" role="group" aria-label="ชนิดแบบประเมิน" data-i18n-aria="assessment_picker_aria">
        <button type="button" data-assessment-type="effectiveness" data-i18n="assessment_picker_effectiveness" class="${type === 'effectiveness' ? 'is-current' : ''}" ${type === 'effectiveness' ? 'aria-current="true"' : ''}>ประสิทธิผล</button>
        <button type="button" data-assessment-type="satisfaction" data-i18n="assessment_picker_satisfaction" class="${type === 'satisfaction' ? 'is-current' : ''}" ${type === 'satisfaction' ? 'aria-current="true"' : ''}>ความพึงพอใจ</button>
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
      const english = root.ThemeLang?.getLang?.() === 'en';
      count.textContent = rows.length ? root.t?.('assessment_picker_count', { visible: visible.length, total: rows.length }) || `แสดง ${visible.length} จาก ${rows.length} ระบบ` : root.t?.('assessment_picker_empty') || 'ไม่พบข้อมูลระบบที่เปิดใช้งาน';
      list.innerHTML = visible.length ? visible.map((item) => `<button type="button" class="system-picker-card" data-system-id="${escapeAttr(item.id)}"><span class="system-picker-id">${escapeHtml(item.id)}</span><strong>${escapeHtml(english ? item.name_en || item.name : item.name)}</strong><span class="system-picker-action" data-i18n="assessment_picker_select">เลือกระบบนี้</span></button>`).join('') : `<p class="picker-empty" role="status">${escapeHtml(root.t?.('assessment_picker_no_match') || 'ไม่พบระบบที่ตรงกับคำค้น ลองค้นด้วยรหัส SYS001–SYS021 หรือชื่อระบบ')}</p>`;
      root.applyTranslations?.(list);
      list.querySelectorAll('[data-system-id]').forEach((button) => button.addEventListener('click', () => {
        const selected = rows.find((item) => item.id === button.dataset.systemId);
        if (selected) onSelect(selected);
      }));
    };
    search.addEventListener('input', draw);
    container.querySelectorAll('[data-assessment-type]').forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.assessmentType !== type) onTypeChange(button.dataset.assessmentType);
    }));
    root.applyTranslations?.(container);
    draw();
    document.addEventListener('langchange', () => { root.applyTranslations?.(container); draw(); });
  }

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  const escapeAttr = escapeHtml;
  root.AssessmentSystemPicker = Object.freeze({ render });
})(window);
