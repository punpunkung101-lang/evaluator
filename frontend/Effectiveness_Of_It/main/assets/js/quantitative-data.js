(function (root) {
    'use strict';
    const keys = { config: 'it_quant_config_v1', records: 'it_quant_records_v1', draft: 'it_quant_draft_v1' };
    const apiBaseUrl = () => root.EvaluatorAPIBaseUrl || root.API_CONFIG?.backendBaseUrl || root.ENV?.API_BASE_URL || 'http://127.0.0.1:8080';
    const draftKey = userId => userId ? `${keys.draft}:${encodeURIComponent(String(userId))}` : null;
    const clone = value => JSON.parse(JSON.stringify(value));
    function read(key, fallback) {
        const raw = localStorage.getItem(key);
        return raw === null ? clone(fallback) : JSON.parse(raw);
    }
    const defaults = () => ({ version: 1, before: [], after: [], metrics: [
        { id: 'time', name: 'ระยะเวลาการทำงาน', unit: 'นาที', basis: 'ต่อคำขอ', direction: 'decrease', source: 'time', active: true, required: true },
        { id: 'steps', name: 'จำนวนขั้นตอนการทำงาน', unit: 'ขั้นตอน', basis: 'ต่อคำขอ', direction: 'decrease', source: 'steps', active: true, required: true },
        { id: 'paper', name: 'จำนวนกระดาษที่ใช้', unit: 'แผ่น', basis: 'ต่อคำขอ', direction: 'decrease', source: 'manual', active: true, required: false },
        { id: 'errors', name: 'จำนวนข้อผิดพลาด', unit: 'ครั้ง', basis: 'ต่อคำขอ', direction: 'decrease', source: 'manual', active: true, required: false }
    ] });
    const finite = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
    function calculate(metric, input) {
        if (!input || input.status !== 'known' || !finite(input.before) || !finite(input.after)) return { available: false, reason: input?.status === 'na' ? 'ไม่เกี่ยวข้อง' : 'ไม่สามารถคำนวณได้: ไม่มีข้อมูลครบถ้วน' };
        const delta = input.after - input.before;
        const percent = input.before === 0 ? null : delta / input.before * 100;
        let improvement = metric.direction === 'increase' ? delta : -delta;
        if (metric.direction === 'target') {
            if (!finite(metric.target)) return { available: false, reason: 'ยังไม่ได้กำหนดเกณฑ์ประสิทธิผล' };
            improvement = Math.abs(input.before - metric.target) - Math.abs(input.after - metric.target);
        }
        return { available: true, delta, percent, outcome: improvement > 0 ? 'ดีขึ้น' : improvement < 0 ? 'แย่ลง' : 'คงเดิม', targetMet: metric.direction === 'target' ? input.after === metric.target : null };
    }
    const api = {
        keys, clone, defaults, calculate, finite,
        demoConfig() {
            const config = defaults();
            config.version = 'demo-1';
            config.isDemo = true;
            config.before = [
                { id: 'demo-b1', name: 'จัดเตรียมคำขอบนกระดาษ', description: 'กระบวนการตัวอย่างเพื่อทดสอบเท่านั้น', active: true, timed: true },
                { id: 'demo-b2', name: 'ส่งเอกสารให้ผู้รับผิดชอบ', description: '', active: true, timed: true },
                { id: 'demo-b3', name: 'ตรวจสอบและพิจารณาคำขอ', description: '', active: true, timed: true },
                { id: 'demo-b4', name: 'แจ้งผลการดำเนินการ', description: '', active: true, timed: true }
            ];
            config.after = [
                { id: 'demo-a1', name: 'กรอกและส่งคำขอออนไลน์', description: 'กระบวนการตัวอย่างเพื่อทดสอบเท่านั้น', active: true, timed: true },
                { id: 'demo-a2', name: 'ตรวจสอบและอนุมัติผ่านระบบ', description: '', active: true, timed: true },
                { id: 'demo-a3', name: 'รับแจ้งผลผ่านระบบ', description: '', active: true, timed: true }
            ];
            return config;
        },
        systems: () => root.AssessmentCatalog ? root.AssessmentCatalog.getSystems() : [],
        config(id) { return clone(read(keys.config, {})[id] || defaults()); },
        saveConfig(id, value) {
            const configs = read(keys.config, {});
            const saved = clone(value);
            saved.version = (configs[id]?.version || 0) + 1;
            configs[id] = saved;
            localStorage.setItem(keys.config, JSON.stringify(configs));
            return saved;
        },
        draft(userId) {
            if (!userId) return null;
            const value = read(draftKey(userId), null);
            return value?.userId === String(userId) ? value : null;
        },
        saveDraft(value, userId) {
            if (!userId) throw new Error('ไม่สามารถบันทึกแบบร่างโดยไม่ระบุบัญชีผู้ใช้');
            const scopedDraft = { ...clone(value), userId: String(userId) };
            localStorage.setItem(draftKey(userId), JSON.stringify(scopedDraft));
        },
        clearDraft(userId) {
            if (userId) localStorage.removeItem(draftKey(userId));
        },
        records: () => read(keys.records, []),
        async submitToBackend(record) {
            const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('evaluatorToken') : null;
            if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนส่งแบบประเมิน');
            const response = await fetch(`${apiBaseUrl()}/quantitative`, {
                method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
                body:JSON.stringify(record)
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || 'บันทึกฐานข้อมูลไม่สำเร็จ');
            return result;
        },
        submit(record, userId) {
            const records = api.records();
            if (!records.some(r => r.id === record.id)) {
                records.push(clone(record));
                localStorage.setItem(keys.records, JSON.stringify(records));
            }
            this.clearDraft(userId || record.userId || record.evaluatorId);
        }
    };
    root.Quantitative = api;
    if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
