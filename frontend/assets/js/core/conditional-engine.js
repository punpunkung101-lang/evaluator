(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NUAHSConditionalEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const hasValue = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
  const readAnswers = (answers) => {
    if (answers instanceof Map) return (id) => answers.get(id);
    if (Array.isArray(answers)) return (id) => {
      const row = answers.find((a) => String(a.questionId ?? a.question_id ?? a.id) === String(id));
      return row && (Object.prototype.hasOwnProperty.call(row, 'value') ? row.value : row.answer);
    };
    return (id) => answers && answers[id];
  };
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function evaluateCondition(condition, answers = {}, context = {}) {
    if (!condition || (typeof condition === 'object' && !Object.keys(condition).length)) return true;
    const get = readAnswers(answers);
    if (Array.isArray(condition.all) && !condition.all.every((c) => evaluateCondition(c, answers, context))) return false;
    if (Array.isArray(condition.any) && condition.any.length && !condition.any.some((c) => evaluateCondition(c, answers, context))) return false;
    if (condition.not && evaluateCondition(condition.not, answers, context)) return false;
    if (condition.question_id || condition.questionId) {
      const actual = get(condition.question_id || condition.questionId);
      const expected = condition.value ?? condition.values;
      switch (condition.operator || 'equals') {
        case 'is_answered': if (hasValue(actual) !== (condition.value !== false)) return false; break;
        case 'not_equals': if (equal(actual, expected)) return false; break;
        case 'in': if (!(Array.isArray(expected) ? expected : [expected]).some((v) => Array.isArray(actual) ? actual.some((x) => equal(x, v)) : equal(actual, v))) return false; break;
        case 'contains': if (!(Array.isArray(actual) ? actual : [actual]).some((v) => equal(v, expected))) return false; break;
        default: if (!equal(actual, expected)) return false;
      }
    }
    if (condition.system) {
      for (const [key, value] of Object.entries(condition.system)) if (!equal(context.system?.[key], value)) return false;
    }
    return true;
  }
  function questionVisible(question, answers = {}, context = {}) {
    const roles = question.roles || [];
    const role = context.respondentRole ?? context.role;
    return (!roles.length || roles.includes(role)) && evaluateCondition(question.visible_when ?? question.visibleWhen, answers, context);
  }
  function getVisibleQuestions(questions, answers = {}, context = {}) {
    return (questions || []).filter((q) => questionVisible(q, answers, context));
  }
  function valuesOf(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const values = value.values ?? value.value;
      return Array.isArray(values) ? values : hasValue(values) ? [values] : [];
    }
    return Array.isArray(value) ? value : hasValue(value) ? [value] : [];
  }
  function isAnswered(value) { return valuesOf(value).length > 0; }
  function validateAnswerRules(rules = [], questions = [], answers = {}) {
    const get = readAnswers(answers), errors = [];
    const optionRules = questions.filter((q) => (q.options || []).some((option) => option.exclusive)).map((q) => ({
      type: 'mutually_exclusive', question_ids: [q.id], exclusive_option_values: q.options.filter((option) => option.exclusive).map((option) => option.value)
    }));
    for (const rule of [...rules, ...optionRules]) {
      if (rule.type !== 'mutually_exclusive') continue;
      for (const id of rule.question_ids || []) {
        const q = questions.find((item) => item.id === id);
        const exclusive = new Set(rule.exclusive_option_values || (q?.options || []).filter((o) => o.exclusive).map((o) => o.value));
        const selected = valuesOf(get(id));
        if (selected.some((v) => exclusive.has(v)) && selected.length > 1) errors.push({ questionId: id, code: 'mutually_exclusive', message: 'เลือกคำตอบที่ใช้ร่วมกันไม่ได้' });
      }
    }
    return errors;
  }
  function validateAnswers({ questions = [], answers = {}, context = {}, answerRules = [] } = {}) {
    const get = readAnswers(answers), errors = [];
    for (const q of getVisibleQuestions(questions, answers, context)) {
      const value = get(q.id), selected = valuesOf(value);
      if (q.required && !isAnswered(value) && !q.allow_na) errors.push({ questionId: q.id, code: 'required', message: 'กรุณาตอบคำถามนี้' });
      if (!isAnswered(value)) continue;
      const options = q.options || [];
      if (['dropdown', 'radio', 'checkbox', 'ranking'].includes(q.answer_type)) {
        for (const selectedValue of selected) if (!options.some((option) => option.value === selectedValue) && !(q.allow_other && selectedValue === 'other')) errors.push({ questionId: q.id, code: 'invalid_option', message: 'ตัวเลือกไม่ถูกต้อง' });
      }
      if (q.answer_type === 'rating5' && !(value === 'N/A' && q.allow_na) && !(Number(value) >= 1 && Number(value) <= 5)) errors.push({ questionId: q.id, code: 'invalid_rating', message: 'คะแนนต้องอยู่ระหว่าง 1 ถึง 5' });
      if (q.answer_type === 'number' && !Number.isFinite(Number(value))) errors.push({ questionId: q.id, code: 'invalid_number', message: 'กรุณาระบุตัวเลข' });
      if (q.answer_type === 'date' && !(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))) errors.push({ questionId: q.id, code: 'invalid_date', message: 'กรุณาระบุวันที่ให้ถูกต้อง' });
      if (q.answer_type === 'yes_no' && !['yes', 'no', true, false].includes(value)) errors.push({ questionId: q.id, code: 'invalid_yes_no', message: 'กรุณาเลือกใช่หรือไม่ใช่' });
      if (q.answer_type === 'checkbox' && q.max_select && selected.length > q.max_select) errors.push({ questionId: q.id, code: 'max_select', message: 'เลือกตัวเลือกเกินจำนวนที่กำหนด' });
      const selectedOther = selected.some((v) => (q.options || []).some((option) => option.value === v && option.allow_other));
      if (selectedOther && q.allow_other && !String(value?.otherText || '').trim()) errors.push({ questionId: q.id, code: 'other_required', message: 'กรุณาระบุรายละเอียดของตัวเลือกอื่น ๆ' });
    }
    errors.push(...validateAnswerRules(answerRules, questions, answers));
    return { valid: errors.length === 0, errors };
  }
  return { evaluateCondition, questionVisible, getVisibleQuestions, validateAnswerRules, validateAnswers };
});
