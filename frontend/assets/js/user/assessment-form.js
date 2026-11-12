(function (root) {
  'use strict';
  const scriptUrl = document.currentScript?.src;
  const appUrl = (path) => root.EvaluatorRuntimeUrl.fromScript(`../../../${String(path).replace(/^frontend\//, '')}`, scriptUrl);
  const app = document.getElementById('assessment-form');
  const type = document.body.dataset.assessmentType || 'effectiveness';
  let systemId = new URLSearchParams(location.search).get('system');
  const draftKey = (userId) => `assessmentDraft:v1:${userId}:${systemId}:${type}`;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const textOf = (q) => document.documentElement.lang === 'en' && q.text_en ? q.text_en : q.text;
  const stepNames = { 1: 'ประสบการณ์เดิม', 2: 'ข้อมูลทั่วไป', 3: type === 'satisfaction' ? 'ความพึงพอใจ' : 'ตัวชี้วัด', 4: 'ปัญหาและข้อเสนอแนะ' };
  const answerValues = (value) => Array.isArray(value) ? value : value && typeof value === 'object' ? (value.values || (value.value ? [value.value] : [])) : value == null ? [] : [value];
  let user, system, questions = [], optionSets = [], answers = {}, steps = [], stepIndex = 0, versionId = '', sending = false;

  function selectedRole() {
    const value = answers.respondent_role ?? answers.__respondentRole;
    const options = optionSets.find((set) => set.id === `roles_${systemId}`)?.options || optionSets.find((set) => set.id === 'roles_by_system')?.valuesBySystem?.[systemId] || [];
    return options.find((option) => option.value === value)?.label || '';
  }
  function context() { return { respondentRole: selectedRole(), system: { id: system?.id, has_tracking: system?.has_tracking } }; }
  function visible() { return root.NUAHSConditionalEngine.getVisibleQuestions(questions, answers, context()); }
  function valuesFor(question) {
    if (question.options?.length) return question.options;
    if (!question.optionSetRef) return [];
    const set = optionSets.find((item) => item.id === question.optionSetRef || item.id === `${question.optionSetRef}_${systemId}`);
    if (!set) return [];
    return set.valuesBySystem?.[systemId] || set.valuesByRole?.[answers.respondent_role] || set.valuesByRole?.[selectedRole()] || set.options || [];
  }
  function currentQuestions() { return visible().filter((q) => q.step === steps[stepIndex]); }
  function inputValue(question, value) {
    if (question.answer_type === 'checkbox' || question.answer_type === 'ranking') return answerValues(value);
    return value && typeof value === 'object' ? value.value : value;
  }
  function choiceField(question, options) {
    const current = answerValues(answers[question.id]);
    const typeAttr = question.answer_type === 'checkbox' ? 'checkbox' : 'radio';
    const choices = options.map((option, index) => {
      const id = `${question.id}-${index}`;
      const checked = current.includes(option.value) ? ' checked' : '';
      return `<label class="choice-option" for="${escape(id)}"><input id="${escape(id)}" name="${escape(question.id)}" type="${typeAttr}" value="${escape(option.value)}"${checked}><span>${escape(option.label || option.value)}</span></label>`;
    }).join('');
    const otherOption = options.find((option) => option.allow_other);
    const otherText = answers[question.id]?.otherText || '';
    const otherInput = otherOption && current.includes(otherOption.value)
      ? `<label class="other-text">ระบุรายละเอียด<input data-other-for="${escape(question.id)}" type="text" value="${escape(otherText)}" maxlength="300" autocomplete="off"></label>` : '';
    return `<fieldset class="answer-choices" data-question="${escape(question.id)}"><legend>${escape(textOf(question))}${question.required ? ' <span aria-hidden="true">*</span>' : ''}</legend>${choices}${question.answer_type === 'checkbox' && question.max_select ? `<small>เลือกได้ไม่เกิน ${question.max_select} ข้อ</small>` : ''}${otherInput}<p class="field-error" id="error-${escape(question.id)}" role="alert"></p></fieldset>`;
  }
  function renderControl(question) {
    const options = valuesFor(question), value = answers[question.id];
    if (['radio', 'checkbox', 'yes_no'].includes(question.answer_type)) {
      const yesNo = question.answer_type === 'yes_no' ? [{ value: 'yes', label: 'ใช่' }, { value: 'no', label: 'ไม่ใช่' }] : options;
      return choiceField(question, yesNo);
    }
    if (question.answer_type === 'dropdown') {
      const selected = inputValue(question, value) ?? '';
      return `<label class="answer-field">${escape(textOf(question))}${question.required ? ' <span aria-hidden="true">*</span>' : ''}<select data-question="${escape(question.id)}"><option value="">เลือกคำตอบ</option>${options.map((o) => `<option value="${escape(o.value)}"${o.value === selected ? ' selected' : ''}>${escape(o.label || o.value)}</option>`).join('')}</select>${options.some((o) => o.allow_other && o.value === selected) ? `<input data-other-for="${escape(question.id)}" type="text" maxlength="300" value="${escape(value?.otherText || '')}" placeholder="โปรดระบุ">` : ''}<small class="field-error" id="error-${escape(question.id)}" role="alert"></small></label>`;
    }
    if (question.answer_type === 'rating5') {
      const score = value === 'N/A' ? 'N/A' : String(value ?? '');
      return `<fieldset class="answer-choices rating-options"><legend>${escape(textOf(question))}${question.required ? ' <span aria-hidden="true">*</span>' : ''}</legend><div class="rating-row">${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="${escape(question.id)}" value="${n}"${score === String(n) ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div>${question.allow_na ? `<label class="choice-option"><input type="radio" name="${escape(question.id)}" value="N/A"${score === 'N/A' ? ' checked' : ''}><span>ไม่เกี่ยวข้อง / ไม่ทราบ</span></label>` : ''}<small>1 = น้อยที่สุด · 5 = มากที่สุด</small><p class="field-error" id="error-${escape(question.id)}" role="alert"></p></fieldset>`;
    }
    if (question.answer_type === 'ranking') {
      const ranked = Array.isArray(value) ? value : [];
      return `<fieldset class="answer-choices"><legend>${escape(textOf(question))}${question.required ? ' *' : ''}</legend>${options.map((option) => `<label class="answer-field">${escape(option.label || option.value)}<select data-rank-question="${escape(question.id)}" data-rank-value="${escape(option.value)}"><option value="">ไม่จัดอันดับ</option>${options.map((_, i) => `<option value="${i + 1}"${ranked.indexOf(option.value) === i ? ' selected' : ''}>${i + 1}</option>`).join('')}</select></label>`).join('')}<small class="field-error" id="error-${escape(question.id)}" role="alert"></small></fieldset>`;
    }
    const controlType = ({ short_text: 'text', long_text: 'textarea', number: 'number', date: 'date' })[question.answer_type] || 'text';
    const field = controlType === 'textarea' ? `<textarea data-question="${escape(question.id)}" rows="4" maxlength="2000">${escape(value || '')}</textarea>` : `<input data-question="${escape(question.id)}" type="${controlType}" value="${escape(value ?? '')}" ${controlType === 'number' ? 'step="any"' : ''}>`;
    return `<label class="answer-field">${escape(textOf(question))}${question.required ? ' <span aria-hidden="true">*</span>' : ''}${field}<small class="field-error" id="error-${escape(question.id)}" role="alert"></small></label>`;
  }
  function questionMarkup(question) { return `<article class="question-card">${renderControl(question)}</article>`; }
  function reviewMarkup() {
    const rows = visible().map((q) => {
      const raw = answers[q.id];
      const options = valuesFor(q);
      const display = answerValues(raw).map((v) => options.find((o) => o.value === v)?.label || v).join(', ') || (raw === 'N/A' ? 'ไม่เกี่ยวข้อง / ไม่ทราบ' : '—');
      return `<li><strong>${escape(textOf(q))}</strong><span>${escape(display)}${raw?.otherText ? ` — ${escape(raw.otherText)}` : ''}</span></li>`;
    }).join('');
    return `<section class="review-card"><h2>ตรวจทานคำตอบ</h2><p>${escape(system.name)} (${system.id}) · ${type === 'effectiveness' ? 'ประสิทธิผล' : 'ความพึงพอใจ'}</p><ol>${rows}</ol></section>`;
  }
  function progressMarkup() {
    const count = steps.length + 1, current = stepIndex;
    return `<div class="form-progress" role="status" aria-label="ความคืบหน้า"><span>ขั้นที่ ${current + 1} จาก ${count}: ${current === steps.length ? 'ตรวจทาน' : escape(stepNames[steps[current]] || `ขั้น ${steps[current]}`)}</span><progress max="${count}" value="${current + 1}"></progress></div>`;
  }
  function render() {
    const isReview = stepIndex === steps.length;
    const stepQuestions = isReview ? [] : currentQuestions();
    app.innerHTML = `${progressMarkup()}<form id="step-form" novalidate>${type === 'satisfaction' ? `<label class="answer-field role-prompt">บทบาทของท่านในการใช้ระบบนี้ <span aria-hidden="true">*</span><select id="satisfaction-role"><option value="">เลือกบทบาท</option>${(optionSets.find((set) => set.id === `roles_${systemId}`)?.options || []).map((o) => `<option value="${escape(o.value)}"${answers.__respondentRole === o.value ? ' selected' : ''}>${escape(o.label)}</option>`).join('')}</select></label>` : ''}${isReview ? reviewMarkup() : `<h2 class="step-heading">${escape(stepNames[steps[stepIndex]] || `ขั้น ${steps[stepIndex]}`)}</h2>${stepQuestions.length ? stepQuestions.map(questionMarkup).join('') : '<p>ไม่มีคำถามที่แสดงในขั้นนี้ตามคำตอบก่อนหน้า</p>'}`}<p id="form-message" role="alert" aria-live="polite"></p><div class="form-actions"><button class="btn btn-secondary" id="back" type="button" ${stepIndex === 0 ? 'disabled' : ''}>ย้อนกลับ</button>${isReview ? `<button class="btn btn-primary" id="submit" type="button" ${sending ? 'disabled' : ''}>${sending ? 'กำลังบันทึก…' : 'ยืนยันและส่ง'}</button>` : `<button class="btn btn-primary" id="next" type="button">ถัดไป</button>`}</div></form>`;
    bindStep();
  }
  function readQuestion(question) {
    const field = app.querySelector(`[data-question="${CSS.escape(question.id)}"]`);
    if (question.answer_type === 'checkbox') {
      const values = [...app.querySelectorAll(`input[name="${CSS.escape(question.id)}"]:checked`)].map((input) => input.value);
      const other = valuesFor(question).find((o) => o.allow_other && values.includes(o.value));
      const otherText = other ? app.querySelector(`[data-other-for="${CSS.escape(question.id)}"]`)?.value?.trim() || '' : '';
      return other ? { values, otherText } : values;
    }
    if (question.answer_type === 'radio' || question.answer_type === 'yes_no' || question.answer_type === 'rating5') {
      const selected = app.querySelector(`input[name="${CSS.escape(question.id)}"]:checked`)?.value ?? null;
      const option = valuesFor(question).find((item) => item.value === selected && item.allow_other);
      return option ? { value: selected, otherText: app.querySelector(`[data-other-for="${CSS.escape(question.id)}"]`)?.value?.trim() || '' } : selected;
    }
    if (question.answer_type === 'ranking') return [...app.querySelectorAll(`[data-rank-question="${CSS.escape(question.id)}"]`)].map((el) => ({ value: el.dataset.rankValue, rank: Number(el.value) })).filter((item) => item.rank).sort((a, b) => a.rank - b.rank).map((item) => item.value);
    if (field?.tagName === 'SELECT') {
      const value = field.value;
      const other = valuesFor(question).find((o) => o.allow_other && o.value === value);
      return other ? { value, otherText: app.querySelector(`[data-other-for="${CSS.escape(question.id)}"]`)?.value?.trim() || '' } : value;
    }
    return field?.value ?? null;
  }
  function capture() {
    for (const q of currentQuestions()) answers[q.id] = readQuestion(q);
    const role = document.getElementById('satisfaction-role'); if (role) answers.__respondentRole = role.value;
    sessionStorage.setItem(draftKey(user.id), JSON.stringify({ answers, stepIndex, formVersionId: versionId }));
  }
  function validateVisible() {
    capture();
    const activeQuestions = stepIndex === steps.length ? questions : currentQuestions();
    const questionsWithOptions = activeQuestions.map((q) => ({ ...q, options: valuesFor(q) }));
    const result = root.NUAHSConditionalEngine.validateAnswers({ questions: questionsWithOptions, answers, context: context() });
    if (type === 'satisfaction' && !selectedRole()) result.errors.push({ questionId: 'satisfaction-role', message: 'กรุณาเลือกบทบาท' });
    for (const error of result.errors) {
      const node = document.getElementById(`error-${CSS.escape(error.questionId)}`) || (error.questionId === 'satisfaction-role' ? document.getElementById('satisfaction-role') : null);
      if (node) { if (node.matches('small, p')) node.textContent = error.message; else { node.setAttribute('aria-invalid', 'true'); node.focus(); } }
    }
    return result.valid && !(type === 'satisfaction' && !selectedRole());
  }
  function bindStep() {
    const form = document.getElementById('step-form');
    form.addEventListener('input', () => { capture(); });
    form.addEventListener('change', (event) => {
      capture();
      if (event.target.type === 'radio' || event.target.type === 'checkbox' || event.target.tagName === 'SELECT') render();
    });
    document.getElementById('back')?.addEventListener('click', () => { capture(); stepIndex = Math.max(0, stepIndex - 1); render(); });
    document.getElementById('next')?.addEventListener('click', () => {
      if (!validateVisible()) { document.getElementById('form-message').textContent = 'โปรดตรวจคำตอบที่จำเป็น'; return; }
      stepIndex = Math.min(steps.length, stepIndex + 1); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('submit')?.addEventListener('click', submit);
  }
  async function submit() {
    if (sending || !validateVisible()) { document.getElementById('form-message').textContent = 'โปรดตรวจคำตอบก่อนส่ง'; return; }
    const validation = root.NUAHSConditionalEngine.validateAnswers({ questions: questions.map((q) => ({ ...q, options: valuesFor(q) })), answers, context: context() });
    if (!validation.valid) { stepIndex = Math.max(0, steps.indexOf(questions.find((q) => q.id === validation.errors[0].questionId)?.step)); render(); return; }
    sending = true; render();
    const roleLabel = type === 'satisfaction' ? selectedRole() : selectedRole();
    const payload = { id: `eval_${crypto.randomUUID()}`, systemId, assessmentType: type, formVersionId: versionId, evaluatorId: user.id, respondentRole: roleLabel || 'ผู้ใช้ระบบ', respondentRoleLabel: roleLabel || 'ผู้ใช้ระบบ', profile: {}, answers: visible().filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '').map((q) => ({ questionId: q.id, value: q.answer_type === 'rating5' && answers[q.id] !== 'N/A' ? Number(answers[q.id]) : answers[q.id] })), submittedAt: new Date().toISOString() };
    try {
      await root.EvaluationAPI.submitAnswers(payload);
      sessionStorage.removeItem(draftKey(user.id));
      app.innerHTML = `<section class="completion-card" role="status"><h2>ส่งแบบประเมินสำเร็จ</h2><p>ระบบบันทึกคำตอบของท่านแล้ว (${escape(system.name)})</p><a class="btn btn-primary" href="${escape(appUrl('frontend/user/index.html'))}">กลับหน้าหลัก</a></section>`;
    } catch (error) {
      sending = false; render(); document.getElementById('form-message').textContent = `บันทึกไม่สำเร็จ: ${error.message}`;
    }
  }
  async function start() {
    try {
      if (!sessionStorage.getItem('evaluatorToken')) throw Object.assign(new Error('กรุณาเข้าสู่ระบบก่อนประเมิน'), { status: 401 });
      user = await root.EvaluatorAuth.verify();
      const systems = await root.EvaluationAPI.getSystems();
      if (!systemId) {
        document.getElementById('assessment-title').textContent = 'เลือกระบบที่ต้องการประเมิน';
        root.AssessmentSystemPicker.render({
          container: app,
          systems,
          type,
          onTypeChange: (nextType) => location.assign(appUrl(nextType === 'satisfaction' ? 'frontend/user/satisfaction/satisfaction.html' : 'frontend/user/effectiveness/evaluation.html')),
          onSelect: (selected) => { const url = new URL(location.href); url.searchParams.set('system', selected.id); location.assign(url.href); }
        });
        return;
      }
      const [fetchedQuestions, fetchedOptions] = await Promise.all([root.EvaluationAPI.getQuestions(systemId, type), root.EvaluationAPI.getOptionSets(systemId)]);
      system = systems.find((item) => item.id === systemId);
      if (!system) throw new Error('ไม่พบระบบที่เลือก');
      questions = fetchedQuestions;
      versionId = questions[0]?.formVersionId || '';
      questions = questions.filter((q) => q.formVersionId === versionId);
      if (!versionId || !questions.length) throw new Error('ยังไม่มีแบบประเมินที่เปิดใช้งานสำหรับระบบนี้');
      optionSets = fetchedOptions;
      steps = [...new Set(questions.map((q) => Number(q.step)))].sort((a, b) => a - b);
      const saved = JSON.parse(sessionStorage.getItem(draftKey(user.id)) || 'null');
      if (saved?.formVersionId === versionId) { answers = saved.answers || {}; stepIndex = Math.min(Number(saved.stepIndex) || 0, steps.length); }
      const title = document.getElementById('assessment-title');
      if (title) title.textContent = `${type === 'effectiveness' ? 'ประเมินประสิทธิผล' : 'แบบประเมินความพึงพอใจ'} · ${system.name}`;
      render();
    } catch (error) {
      if (error.status === 401) {
        const loginUrl = new URL(appUrl('frontend/user/index.html'));
        loginUrl.searchParams.set('login', '1');
        const returnUrl = new URL(location.href); loginUrl.searchParams.set('returnTo', returnUrl.pathname + returnUrl.search + returnUrl.hash);
        location.assign(loginUrl.href); return;
      }
      app.innerHTML = `<p class="form-error" role="alert">โหลดแบบประเมินไม่สำเร็จ: ${escape(error.message)}</p>`;
    }
  }
  start();
})(window);
