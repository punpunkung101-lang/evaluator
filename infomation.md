# คู่มือโครงการ NUAHS IT Evaluation

รีโพซิทอรีนี้รวบรวมโครงการประเมินระบบสารสนเทศของคณะสหเวชศาสตร์ มหาวิทยาลัยนเรศวร โดยแยกตามวัตถุประสงค์ของการประเมิน

## โครงสร้างปัจจุบัน

```text
NUAHS/
├── Effectiveness_Of_It/
│   ├── frontend/                  # เตรียมสำหรับหน้าประเมินประสิทธิผล
│   ├── backend/                   # เตรียมสำหรับ API หรือบริการหลังบ้าน
│   └── README.md
└── Satisfaction_Survey/
    ├── frontend/
    │   ├── user/                  # index.html, evaluation.html, satisfaction.html
    │   ├── admin/                 # dashboard.html, evaluation-detail.html
    │   └── assets/                # CSS และ JavaScript ที่ใช้ร่วมกัน
    ├── backend/src/               # ซอร์ส C++ ที่มีอยู่
    └── database/                  # schema.sql และ seed.sql
```

## Satisfaction Survey

ระบบแบบสำรวจความพึงพอใจอยู่ที่ `NUAHS/Satisfaction_Survey` หน้าเริ่มต้นคือ `frontend/user/index.html` ผู้ใช้กรอกข้อมูลผู้ประเมิน เลือกระบบ และตอบคำถาม จากนั้นผลการประเมินสามารถส่งต่อไปยังหน้าความพึงพอใจได้

ไฟล์ JavaScript ส่วนกลาง `frontend/assets/js/shared/api.js` รองรับการบันทึกผ่าน backend หรือ Supabase เมื่อกำหนดค่าไว้ และใช้ local storage เป็นทางเลือกสำรอง

### การเปิดใช้งาน

1. เปิดโฟลเดอร์ `NUAHS/Satisfaction_Survey` ใน VS Code
2. เปิด `frontend/user/index.html` ด้วยเว็บเบราว์เซอร์ หรือใช้ Live Server
3. ทดสอบการกรอกข้อมูลและลำดับการตอบแบบประเมินจนถึงหน้าความพึงพอใจ

## Effectiveness of IT

โฟลเดอร์ `NUAHS/Effectiveness_Of_It` แยกไว้สำหรับระบบประเมินประสิทธิผลโดยเฉพาะ ขณะนี้มีเพียงโครงสร้างโครงการและยังไม่มีข้อกำหนดเชิงฟังก์ชันหรือบริการหลังบ้าน การพัฒนาในอนาคตให้วางหน้าเว็บใน `frontend` และวาง API หรือบริการใน `backend` โดยไม่ใช้ไฟล์ของ `Satisfaction_Survey` แบบข้ามโครงการ
