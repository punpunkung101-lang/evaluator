# คู่มือโครงการ NUAHS IT Evaluation

รีโพซิทอรีนี้รวบรวมโครงการประเมินระบบสารสนเทศของคณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร โดยแยกตามวัตถุประสงค์ของการประเมิน

## โครงสร้างปัจจุบัน

```text
evaluator/
├── frontend/
│   ├── Satisfaction_Survey/
│   │   ├── user/                  # index.html, evaluation.html, satisfaction.html
│   │   ├── admin/                 # dashboard.html, evaluation-detail.html
│   │   └── assets/                # CSS และ JavaScript ที่ใช้ร่วมกัน
│   └── Effectiveness_Of_It/
│       └── main/                  # เตรียมสำหรับหน้าประเมินประสิทธิผล
├── backend/src/                   # ซอร์ส C++ ที่มีอยู่
└── database/                      # schema.sql และ seed.sql
```

## Satisfaction Survey

ระบบแบบสำรวจความพึงพอใจอยู่ที่ `frontend/Satisfaction_Survey` หน้าเริ่มต้นคือ `user/index.html` ผู้ใช้กรอกข้อมูลผู้ประเมิน เลือกระบบ และตอบคำถาม จากนั้นผลการประเมินสามารถส่งต่อไปยังหน้าความพึงพอใจได้

ไฟล์ JavaScript ส่วนกลาง `frontend/assets/js/shared/api.js` รองรับการบันทึกผ่าน backend หรือ Supabase เมื่อกำหนดค่าไว้ และใช้ local storage เป็นทางเลือกสำรอง

### การเปิดใช้งาน

1. เปิดโฟลเดอร์ `frontend/Satisfaction_Survey` ใน VS Code
2. เปิด `user/index.html` ด้วยเว็บเบราว์เซอร์ หรือใช้ Live Server
3. ทดสอบการกรอกข้อมูลและลำดับการตอบแบบประเมินจนถึงหน้าความพึงพอใจ

## Effectiveness of IT

โฟลเดอร์ `frontend/Effectiveness_Of_It/main` แยกไว้สำหรับระบบประเมินประสิทธิผลโดยเฉพาะ ขณะนี้มีเพียงโครงสร้างโครงการและยังไม่มีข้อกำหนดเชิงฟังก์ชันหรือบริการหลังบ้าน การพัฒนาในอนาคตให้วางหน้าเว็บใน `main` และวาง API หรือบริการใน `backend` โดยไม่ใช้ไฟล์ของ `Satisfaction_Survey` แบบข้ามโครงการ
