const test=require('node:test');
const assert=require('node:assert/strict');
const {translate}=require('../../frontend/Effectiveness_Of_It/main/assets/js/evaluation-locale.js');
test('step counter and longest UI phrases translate without changing numbers',()=>{
    assert.equal(translate('ขั้นที่ 5 จาก 5: ตรวจสอบและส่ง','en'),'Step 5 of 5: Review & submit');
    assert.equal(translate('ยังไม่ถึงเป้าหมาย','en'),'Target not met');
    assert.equal(translate('คำนวณเปอร์เซ็นต์ไม่ได้: ค่าเดิมเป็น 0','en'),'Percentage unavailable: baseline is zero');
});
test('validation and confirmation use complete English messages',()=>{
    assert.equal(translate('กรุณากรอกชื่อหรือนามสมมุติ','en'),'Enter your name or a pseudonym');
    assert.equal(translate('กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนยืนยัน','en'),'Please review your information before confirming');
    assert.equal(translate('ยืนยันการส่งข้อมูล','en'),'Confirm submission');
});
test('Thai source copy and Latin identifiers remain intact',()=>{
    const thai='ข้อมูลผู้ประเมิน';assert.equal(translate(thai,'th'),thai);
    assert.equal(translate('SYS002 — 240 / 30','en'),'SYS002 — 240 / 30');
});
