(function (root) {
  'use strict';
  const scriptUrl = document.currentScript?.src;
  const appUrl = (path) => root.EvaluatorRuntimeUrl.fromScript(`../../../${String(path).replace(/^frontend\//, '')}`, scriptUrl);
  const app = document.getElementById('assessment-form');
  const type = document.body.dataset.assessmentType || 'effectiveness';
  let systemId = new URLSearchParams(location.search).get('system');
  const draftKey = (userId) => `assessmentDraft:v1:${userId}:${systemId}:${type}`;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tr = (key, params) => root.t?.(key, params) || key;
  const isEnglish = () => document.documentElement.lang === 'en';
  const textOf = (q) => isEnglish() ? (q.text_en || (q.id === 'history_experience' ? tr('form_history_question') : q.text)) : q.text;
  const optionText = (option) => {
    if (!isEnglish()) return option.label || option.value;
    if (option.label_en) return option.label_en;
    const key = { used_old_system: 'form_history_used_old', never_used: 'form_history_never_used', offline_only: 'form_history_offline', yes: 'form_yes', no: 'form_no' }[option.value];
    return key ? tr(key) : option.label || option.value;
  };
  const stepName = (step) => ({ 1: tr('form_step_history'), 2: tr('form_step_general'), 3: tr(type === 'satisfaction' ? 'form_step_satisfaction' : 'form_step_indicators'), 4: tr('form_step_problems') })[step] || tr('form_general_step', { step });
  const answerValues = (value) => Array.isArray(value) ? value : value && typeof value === 'object' ? (value.values || (value.value ? [value.value] : [])) : value == null ? [] : [value];
  let user, system, questions = [], optionSets = [], answers = {}, steps = [], stepIndex = 0, versionId = '', sending = false;

  function selectedRole() {
    const value = answers.respondent_role ?? answers.__respondentRole;
    const options = optionSets.find((set) => set.id === `roles_${systemId}`)?.options || optionSets.find((set) => set.id === 'roles_by_system')?.valuesBySystem?.[systemId] || [];
    return options.find((item) => item.value === value)?.label || '';
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
      return `<label class="choice-option" for="${escape(id)}"><input id="${escape(id)}" name="${escape(question.id)}" type="${typeAttr}" value="${escape(option.value)}"${checked}><span>${escape(optionText(option))}</span></label>`;
    }).join('');
    const otherOption = options.find((option) => option.allow_other);
    const otherText = answers[question.id]?.otherText || '';
    const otherInput = otherOption && current.includes(otherOption.value)
      ? `<label class="other-text">${escape(tr('form_other_details'))}<input data-other-for="${escape(question.id)}" type="text" value="${escape(otherText)}" maxlength="300" autocomplete="off"></label>` : '';
    return `<fieldset class="answer-choices" data-question="${escape(question.id)}"><legend>${escape(textOf(question))}${question.required ? ' <span aria-hidden="true">*</span>' : ''}</legend>${choices}${question.answer_type === 'checkbox' && question.max_select ? `<small>${escape(tr('form_select_limit', { count: question.max_select }))}</small>` : ''}${otherInput}<p class="field-error" id="error-${escape(question.id)}" role="alert"></p></fieldset>`;
  }
  function renderControl(question) {
    const options = valuesFor(question), value = answers[question.id];
    if (['radio', 'checkbox', 'yes_no'].includes(question.answer_type)) {
      const yesNo = question.answer_type === 'yes_no' ? [{ value: 'yes', label: 'ใช่' }, { value: 'no', label: 'ไม่ใช่' }] : options;
      return choiceField(question, yesNo);
    }
    if (question.answer_type === 'dropdown') {
      const selected = inputValue(question, value) ?? '';
      return `<label class="answer-field">${escape(textOf(question))}${question.required ? ' <span aria-hidden="true">*</span>' : ''}<select data-question="${escape(question.id)}"><option value="">${escape(tr('form_select_answer'))}</option>${options.map((o) => `<option value="${escape(o.value)}"${o.value === selected ? ' selected' : ''}>${escape(optionText(o))}</option>`).join('')}</select>${options.some((o) => o.allow_other && o.value === selected) ? `<input data-other-for="${escape(question.id)}" type="text" maxlength="300" value="${escape(value?.otherText || '')}" placeholder="${escape(tr('form_specify'))}">` : ''}<small class="field-error" id="error-${escape(question.id)}" role="alert"></small></label>`;
    }
    if (question.answer_type === 'rating5') {
      const score = value === 'N/A' ? 'N/A' : String(value ?? '');
      return `<fieldset class="answer-choices rating-options"><legend>${escape(textOf(question))}${question.required ? ' <span aria-hidden="true">*</span>' : ''}</legend><div class="rating-row">${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="${escape(question.id)}" value="${n}"${score === String(n) ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div>${question.allow_na ? `<label class="choice-option"><input type="radio" name="${escape(question.id)}" value="N/A"${score === 'N/A' ? ' checked' : ''}><span>${escape(tr('form_na'))}</span></label>` : ''}<small>${escape(tr('form_rating_scale'))}</small><p class="field-error" id="error-${escape(question.id)}" role="alert"></p></fieldset>`;
    }
    if (question.answer_type === 'ranking') {
      const ranked = Array.isArray(value) ? value : [];
      return `<fieldset class="answer-choices"><legend>${escape(textOf(question))}${question.required ? ' *' : ''}</legend>${options.map((option) => `<label class="answer-field">${escape(optionText(option))}<select data-rank-question="${escape(question.id)}" data-rank-value="${escape(option.value)}"><option value="">${escape(tr('form_not_ranked'))}</option>${options.map((_, i) => `<option value="${i + 1}"${ranked.indexOf(option.value) === i ? ' selected' : ''}>${i + 1}</option>`).join('')}</select></label>`).join('')}<small class="field-error" id="error-${escape(question.id)}" role="alert"></small></fieldset>`;
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
      const display = answerValues(raw).map((v) => { const option = options.find((o) => o.value === v); return option ? optionText(option) : v; }).join(', ') || (raw === 'N/A' ? tr('form_na') : tr('form_no_relation'));
      return `<li><strong>${escape(textOf(q))}</strong><span>${escape(display)}${raw?.otherText ? ` — ${escape(raw.otherText)}` : ''}</span></li>`;
    }).join('');
    return `<section class="review-card"><h2>${escape(tr('form_review_title'))}</h2><p>${escape(isEnglish() ? system.name_en || system.name : system.name)} (${system.id}) · ${escape(tr(type === 'effectiveness' ? 'form_title_effectiveness' : 'form_title_satisfaction'))}</p><ol>${rows}</ol></section>`;
  }
  function progressMarkup() {
    const count = steps.length + 1, current = stepIndex;
    return `<div class="form-progress" role="status" aria-label="${escape(tr('form_progress_aria'))}"><span>${escape(tr('form_step_progress', { current: current + 1, count, step: current === steps.length ? tr('form_review') : stepName(steps[current]) }))}</span><progress max="${count}" value="${current + 1}"></progress></div>`;
  }
  function render() {
    const isReview = stepIndex === steps.length;
    const stepQuestions = isReview ? [] : currentQuestions();
    app.innerHTML = `${progressMarkup()}<form id="step-form" novalidate>${type === 'satisfaction' ? `<label class="answer-field role-prompt">${escape(tr('form_role_prompt'))} <span aria-hidden="true">*</span><select id="satisfaction-role"><option value="">${escape(tr('form_select_role'))}</option>${(optionSets.find((set) => set.id === `roles_${systemId}`)?.options || []).map((o) => `<option value="${escape(o.value)}"${answers.__respondentRole === o.value ? ' selected' : ''}>${escape(optionText(o))}</option>`).join('')}</select></label>` : ''}${isReview ? reviewMarkup() : `<h2 class="step-heading">${escape(stepName(steps[stepIndex]))}</h2>${stepQuestions.length ? stepQuestions.map(questionMarkup).join('') : `<p>${escape(tr('form_no_questions'))}</p>`}`}<p id="form-message" role="alert" aria-live="polite"></p><div class="form-actions"><button class="btn btn-secondary" id="back" type="button" ${stepIndex === 0 ? 'disabled' : ''}>${escape(tr('form_back'))}</button>${isReview ? `<button class="btn btn-primary" id="submit" type="button" ${sending ? 'disabled' : ''}>${escape(tr(sending ? 'form_saving' : 'form_submit'))}</button>` : `<button class="btn btn-primary" id="next" type="button">${escape(tr('form_next'))}</button>`}</div></form>`;
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
    if (question.answer_type === 'number') {
      const value = field?.value ?? '';
      return value === '' ? '' : Number(value);
    }
    return field?.value ?? null;
  }
  function capture() {
    for (const q of currentQuestions()) answers[q.id] = readQuestion(q);
    const role = document.getElementById('satisfaction-role'); if (role) answers.__respondentRole = role.value;
    sessionStorage.setItem(draftKey(user.id), JSON.stringify({ answers, stepIndex, formVersionId: versionId }));
  }
  function showValidationErrors(errors) {
    for (const error of errors) {
      const node = document.getElementById(`error-${CSS.escape(error.questionId)}`) || (error.questionId === 'satisfaction-role' ? document.getElementById('satisfaction-role') : null);
      if (node) {
        if (node.matches('small, p')) node.textContent = tr(`form_validation_${error.code}`) || error.message;
        else { node.setAttribute('aria-invalid', 'true'); node.focus(); }
      }
    }
  }
  function validateVisible(allQuestions = false) {
    capture();
    const activeQuestions = allQuestions || stepIndex === steps.length ? questions : currentQuestions();
    const questionsWithOptions = activeQuestions.map((q) => ({ ...q, options: valuesFor(q) }));
    const result = root.NUAHSConditionalEngine.validateAnswers({ questions: questionsWithOptions, answers, context: context() });
    if (type === 'satisfaction' && !selectedRole()) result.errors.push({ questionId: 'satisfaction-role', code: 'role', message: tr('form_validation_role') });
    showValidationErrors(result.errors);
    return result.valid && !(type === 'satisfaction' && !selectedRole());
  }
  function returnToInvalidQuestion() {
    const validation = root.NUAHSConditionalEngine.validateAnswers({ questions: questions.map((q) => ({ ...q, options: valuesFor(q) })), answers, context: context() });
    if (type === 'satisfaction' && !selectedRole()) validation.errors.push({ questionId: 'satisfaction-role', code: 'role', message: tr('form_validation_role') });
    if (validation.valid && !(type === 'satisfaction' && !selectedRole())) return false;
    const question = questions.find((q) => q.id === validation.errors[0]?.questionId);
    const invalidStep = question ? steps.indexOf(Number(question.step)) : 0;
    stepIndex = Math.max(0, invalidStep);
    render();
    showValidationErrors(validation.errors);
    document.getElementById('form-message').textContent = tr('form_required_check');
    return true;
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
      if (!validateVisible()) { document.getElementById('form-message').textContent = tr('form_required_check'); return; }
      if (stepIndex === steps.length - 1 && returnToInvalidQuestion()) return;
      stepIndex = Math.min(steps.length, stepIndex + 1); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('submit')?.addEventListener('click', submit);
  }
  async function submit() {
    if (sending) return;
    capture();
    if (returnToInvalidQuestion()) return;
    sending = true; render();
    const roleLabel = type === 'satisfaction' ? selectedRole() : selectedRole();
    const payload = { id: `eval_${crypto.randomUUID()}`, systemId, assessmentType: type, formVersionId: versionId, evaluatorId: user.id, respondentRole: roleLabel || 'ผู้ใช้ระบบ', respondentRoleLabel: roleLabel || 'ผู้ใช้ระบบ', profile: {}, answers: visible().filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '').map((q) => ({ questionId: q.id, value: q.answer_type === 'rating5' && answers[q.id] !== 'N/A' ? Number(answers[q.id]) : answers[q.id] })), submittedAt: new Date().toISOString() };
    try {
      await root.EvaluationAPI.submitAnswers(payload);
      sessionStorage.removeItem(draftKey(user.id));
      app.innerHTML = `<section class="completion-card" role="status"><h2>${escape(tr('form_complete_title'))}</h2><p>${escape(tr('form_complete_text', { system: isEnglish() ? system.name_en || system.name : system.name }))}</p><a class="btn btn-primary" href="${escape(appUrl('frontend/user/index.html'))}">${escape(tr('form_return_home'))}</a></section>`;
    } catch (error) {
      sending = false; render(); document.getElementById('form-message').textContent = tr('form_error_save', { message: error.message });
    }
  }
  async function start() {
    try {
      if (!sessionStorage.getItem('evaluatorToken')) throw Object.assign(new Error('กรุณาเข้าสู่ระบบก่อนประเมิน'), { status: 401 });
      user = await root.EvaluatorAuth.verify();
      const systems = await root.EvaluationAPI.getSystems();
      if (!systemId) {
        document.getElementById('assessment-title').textContent = root.t?.('assessment_picker_title') || 'เลือกระบบที่ต้องการประเมิน';
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
      if (title) title.textContent = `${tr(type === 'effectiveness' ? 'form_title_effectiveness' : 'form_title_satisfaction')} · ${isEnglish() ? system.name_en || system.name : system.name}`;
      render();
    } catch (error) {
      if (error.status === 401) {
        const loginUrl = new URL(appUrl('frontend/user/index.html'));
        loginUrl.searchParams.set('login', '1');
        const returnUrl = new URL(location.href); loginUrl.searchParams.set('returnTo', returnUrl.pathname + returnUrl.search + returnUrl.hash);
        location.assign(loginUrl.href); return;
      }
      app.innerHTML = `<p class="form-error" role="alert">${escape(tr('form_error_load', { message: error.message }))}</p>`;
    }
  }
  document.addEventListener('langchange', () => {
    if (systemId && system && steps.length) {
      capture();
      render();
      const title = document.getElementById('assessment-title');
      if (title) title.textContent = `${tr(type === 'effectiveness' ? 'form_title_effectiveness' : 'form_title_satisfaction')} · ${isEnglish() ? system.name_en || system.name : system.name}`;
    } else if (!systemId) {
      const title = document.getElementById('assessment-title');
      if (title) title.textContent = root.t?.('assessment_picker_title') || 'เลือกระบบที่ต้องการประเมิน';
    }
  });
  start();
})(window);
